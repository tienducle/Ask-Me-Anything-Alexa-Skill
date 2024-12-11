import Environment from "../../../environment.mjs";
import {Logger} from "../../logger.mjs";

import {LlmService} from "../llm-service.mjs";
import {Tools} from "../common/tools/tools.mjs";
import {Message} from "../../model/message/message.mjs";

import {OpenAiMessage} from "./model/open-ai-message.mjs";
import {OpenAiTool} from "./model/open-ai-tool.mjs";

import Content from "../../model/message/content/content.mjs";
import {FunctionCallRequestContent} from "../../model/message/content/function-call-request-content.mjs";
import {FunctionCallResultContent} from "../../model/message/content/function-call-result-content.mjs";

const logger = new Logger('OpenAiService', process.env.LOG_LEVEL_OPEN_AI_SERVICE);
const API_KEY = Environment.openAiApiKey
const DEFAULT_MODEL = Environment.defaultOpenAiModel

const API_HOSTNAME = 'api.openai.com';
const API_VERSION = 'v1';
const API_BASE_PATH_CHAT_COMPLETIONS = '/chat/completions';

const SYSTEM_MESSAGE = {
    role: "system", content: `You are a helpful assistant.
The user will ask you questions and you will provide answers in the same language that the user uses.
Be precise and informative.
Your answers shouldn't be too long unless the user asks for more details.
Your answer text will be read by Alexa and shown to the user on an Amazon Echo Show device.
If you need up-to-date information, you can search the web using the 'web_search' tool. Do not respond with URLs, instead use the 'get_webpage_content' tool to retrieve the content of a web page and extract the necessary information for the user.
Do not use the web search tool for general knowledge questions, only for up-to-date information.`
}

export class OpenAiService extends LlmService {

    static ID = "OpenAI";

    static MODELS = {
        "gpt-4o": {
            maxTokens: 16384
        },
        "gpt-4o-mini": {
            maxTokens: 16384
        }
    }

    constructor() {
        super(API_KEY, DEFAULT_MODEL);

        this.tools = [];
        Tools.AllTools.forEach(tool => this.tools.push({
            api: OpenAiTool.fromGenericToolApi(tool.api), internal: tool.internal
        }));
    }

    /**
     * Workarounds because OpenAI rejects requests with malformed message history,
     * i.e. previous conversation was aborted due to any reason
     * @param messages {Message[]}
     */
    cleanupAbortedSession(messages) {
        if (messages.length === 0) {
            return;
        }

        // last message in history was from tool call, but without any response from assistant
        if (messages[messages.length - 1].role === "tool") {
            messages.pop();
            return this.cleanupAbortedSession(messages);
        }

        // last message in history was tool call from assistant, but didn't receive a result
        if (messages[messages.length - 1].tool_calls?.length > 0) {
            messages.pop();
            return this.cleanupAbortedSession(messages);
        }

        // last message in history was from user, but without any response from assistant
        if (messages[messages.length - 1].role === "user") {
            messages.pop();
        }
    }

    /**
     * Workarounds because OpenAI rejects requests with malformed message history
     * i.e. after adding new messaegs and old messages were deleted due to max history length
     * @param messages {Message[]}
     */
    sanitizeHeadMessages(messages) {
        if (messages.length === 0) {
            return;
        }

        // first message is a tool call, this is not allowed
        if (messages[0].role === "tool") {
            messages.shift();
            return this.sanitizeHeadMessages(messages);
        }
    }

    /**
     *
     * @param scopedUserDataManager {ScopedUserDataManager}
     * @param messageHistory {Message[]}
     * @param nextMessage {Message}
     *
     * @return {Promise<[OpenAiMessage]>}
     */
    async initializeMessages(scopedUserDataManager, messageHistory, nextMessage) {
        this.sanitizeHeadMessages(messageHistory);
        const messages = [
            // system message
            {
                role: SYSTEM_MESSAGE.role,
                content: `The current datetime is ${new Date().toISOString()}.\n${SYSTEM_MESSAGE.content}`
            },
            // message history
            ...messageHistory.map((message) => this.#toOpenAiMessage(message))
        ];

        if (nextMessage) {
            messages.push(this.#toOpenAiMessage(nextMessage));
            await scopedUserDataManager.addMessageToHistory(nextMessage);
        }
        this.sanitizeHeadMessages(messageHistory);
        return messages;
    }

    /**
     *
     * @param apiKey {string}
     * @param model {string}
     * @param messages {[OpenAiMessage]}
     * @return {Promise<*>}
     */
    async getNextResponse(apiKey, model, messages) {

        const url = `https://${API_HOSTNAME}/${API_VERSION}${API_BASE_PATH_CHAT_COMPLETIONS}`

        const body = {
            messages: messages,
            tools: this.tools.map((tool) => tool.api),
            "temperature": 0.7,
            "model": model,
            "n": 1,
            "max_tokens": OpenAiService.MODELS[model].maxTokens
        };

        const options = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
        };

        if (logger.checkLogLevel(Logger.LEVEL_DEBUG)) {
            logger.debug(`Sending request to OpenAI with body: ${JSON.stringify(body)}`);
        }

        try {
            const response = await fetch(url, options);
            const responseJson = await response.json();

            if (responseJson.error?.message) {
                return responseJson.error.message;
            }

            if (logger.checkLogLevel(Logger.LEVEL_DEBUG)) {
                logger.debug(`OpenAI response: ${JSON.stringify(responseJson)}`);
            }

            // return await this.#handleChatCompletionResponse(scopedUserDataManager, responseJson);
            return responseJson;
        } catch (error) {
            logger.error(`Failed to get answer from OpenAI: ${error}`);
            return error;
        }
    }

    isFunctionCallRequest(responseJson) {
        return responseJson?.choices[0]?.finish_reason === "tool_calls";
    }

    async handleFunctionCallRequest(scopedUserDataManager, responseJson, getNextResponseCallback) {
        const toolCalls = responseJson?.choices[0]?.message.tool_calls;

        const messageContents = [];
        toolCalls.forEach(toolCallDetails => {
            messageContents.push(new FunctionCallRequestContent(toolCallDetails.id, toolCallDetails.type, toolCallDetails.function.name, JSON.parse(toolCallDetails.function.arguments)));
        });

        await scopedUserDataManager.addMessageToHistory(new Message("assistant", messageContents));

        const toolCallRequests = [];

        toolCalls.forEach(toolCallDetails => {
            logger.debug(`Handling function call: ${JSON.stringify(toolCallDetails)}`);
            const tool = this.#determineTool(toolCallDetails);
            if (!tool) {
                throw new Error(`Failed to handle tool call: ${JSON.stringify(toolCallDetails)}`);
            }

            toolCallRequests.push(tool.internal.execute({...JSON.parse(toolCallDetails.function.arguments)})
                .then(responseJson => {
                    if (responseJson.error) {
                        const messageContents = [];
                        messageContents.push(new FunctionCallResultContent(toolCallDetails.id, responseJson.error));
                        return new Message("tool", messageContents);
                    }

                    const filteredResponse = tool.internal.getFilteredResponse(responseJson);
                    const messageContents = [];
                    messageContents.push(new FunctionCallResultContent(toolCallDetails.id, (typeof filteredResponse !== "string") ? JSON.stringify(filteredResponse) : filteredResponse));
                    return new Message("tool", messageContents);
                }));
        });

        // wait for all tool calls to finish
        let toolCallResults = await Promise.all(toolCallRequests);

        for (const result of toolCallResults) {
            await scopedUserDataManager.addMessageToHistory(result);
        }

        return getNextResponseCallback();
    }

    async handleResponse(scopedUserDataManager, responseJson) {
        const result = responseJson?.choices[0]?.message.content;
        await scopedUserDataManager.addMessageToHistory(new Message("assistant", result));
        return result;
    }

    #determineTool(toolCallDetails) {
        for (const tool of this.tools) {
            if (toolCallDetails.function.name === tool.api.function.name) {
                logger.debug(`Calling tool: ${tool.api.function.name}`);
                return tool;
            }
        }
    }

    /**
     * Convert generic message to OpenAI message
     *
     * @param message {Message}
     * @return {OpenAiMessage}
     */
    #toOpenAiMessage(message) {
        const openAiMessage = new OpenAiMessage(message.getRole());

        // determine type by first content element, since
        // OpenAI API does not use multi-type contents in a single message (?)
        const contentType = message.content[0].type;
        switch (contentType) {
            case Content.TEXT:
                message.content.forEach(content => openAiMessage.addContent({
                    type: content.getType(), text: content.getText()
                }));
                break;
            case Content.FUNCTION_CALL_REQUEST:
                message.content.forEach(content => {
                    /** @type {FunctionCallRequestContent} */
                    const functionCallRequestContent = content;
                    openAiMessage.addToolCall({
                        id: functionCallRequestContent.getId(),
                        type: functionCallRequestContent.getFunctionType(),
                        function: {
                            name: functionCallRequestContent.getFunctionName(),
                            arguments: JSON.stringify(functionCallRequestContent.getFunctionArguments())
                        }
                    });
                });
                break;
            case Content.FUNCTION_CALL_RESULT:
                message.content.forEach(content => {
                    /** @type {FunctionCallResultContent} */
                    const functionCallResultContent = content;
                    openAiMessage.setToolCallId(functionCallResultContent.getId());
                    openAiMessage.setContent(functionCallResultContent.getContent());
                });
                break;
        }

        return openAiMessage;
    }
}