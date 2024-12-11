import Environment from "../../../environment.mjs";
import {Logger} from "../../logger.mjs";

import {LlmService} from "../llm-service.mjs";
import {Tools} from "../common/tools/tools.mjs";
import {Message} from "../../model/message/message.mjs";

import {AnthropicMessage} from "./model/anthropic-message.mjs";
import {AnthropicTool} from "./model/anthropic-tool.mjs";

import {FunctionCallRequestContent} from "../../model/message/content/function-call-request-content.mjs";
import {FunctionCallResultContent} from "../../model/message/content/function-call-result-content.mjs";
import {TextContent} from "../../model/message/content/text-content.mjs";

const logger = new Logger('AnthropicService', process.env.LOG_LEVEL_OPEN_AI_SERVICE);
const API_KEY = Environment.anthropicApiKey
const DEFAULT_MODEL = Environment.defaultAnthropicModel

const API_HOSTNAME = 'api.anthropic.com';
const API_VERSION = 'v1';
const API_BASE_PATH_CHAT_COMPLETIONS = '/messages';

const SYSTEM_MESSAGE = {
    role: "system", content: `You are a helpful assistant.
The user will ask you questions and you will provide answers in the same language that the user uses.
Be precise and informative.
Your answers shouldn't be too long unless the user asks for more details.
Your answer text will be read by Alexa and shown to the user on an Amazon Echo Show device.
If you need up-to-date information, you can search the web using the 'web_search' tool. Do not respond with URLs, instead use the 'get_webpage_content' tool to retrieve the content of a web page and extract the necessary information for the user.
Do not use the web search tool for general knowledge questions, only for up-to-date information.`
}

export class AnthropicService extends LlmService {

    static ID = "Anthropic";

    static MODELS = {
        "claude-3-5-sonnet-latest": {
            maxTokens: 8192
        },
        "claude-3-5-haiku-latest": {
            maxTokens: 8192
        }
    }

    constructor() {
        super(API_KEY, DEFAULT_MODEL);

        this.tools = [];
        Tools.AllTools.forEach(tool => this.tools.push({
            api: AnthropicTool.fromGenericToolApi(tool.api),
            internal: tool.internal
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
        // if (messages[messages.length - 1].role === "tool") {
        //     messages.pop();
        //     return this.cleanupAbortedSession(messages);
        // }

        // last message in history was tool call from assistant, but didn't receive a result
        // if (messages[messages.length - 1].tool_calls?.length > 0) {
        //     messages.pop();
        //     return this.cleanupAbortedSession(messages);
        // }

        // last message in history was from user, but without any response from assistant
        // if (messages[messages.length - 1].role === "user") {
        //     messages.pop();
        // }
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

        // first message is from user and any content is a tool result, this is not allowed
        if (messages[0].role === "user" && messages[0]?.content.some(content => content instanceof FunctionCallResultContent)) {
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
     * @return {Promise<[AnthropicMessage]>}
     */
    async initializeMessages(scopedUserDataManager, messageHistory, nextMessage) {
        this.sanitizeHeadMessages(messageHistory);
        const messages = [
            ...messageHistory.map((message) => this.#toAnthropicMessage(message)),
        ];
        if (nextMessage) {
            messages.push(this.#toAnthropicMessage(nextMessage));
            await scopedUserDataManager.addMessageToHistory(nextMessage);
        }
        this.sanitizeHeadMessages(messageHistory);
        return messages;
    }

    /**
     *
     * @param apiKey {string}
     * @param model {string}
     * @param messages {[AnthropicMessage]}
     * @return {Promise<*>}
     */
    async getNextResponse(apiKey, model, messages) {

        const url = `https://${API_HOSTNAME}/${API_VERSION}${API_BASE_PATH_CHAT_COMPLETIONS}`;

        const body = {
            system: `The current datetime is ${new Date().toISOString()}.\n${SYSTEM_MESSAGE.content}`,
            messages: messages,
            tools: this.tools.map((tool) => tool.api),
            temperature: 0.7,
            model: model,
            max_tokens: AnthropicService.MODELS[model].maxTokens,
            stream: false
        };

        const requestOptions = {
            method: 'POST',
            headers: {
                "Content-Type": 'application/json',
                "anthropic-version": '2023-06-01',
                "x-api-key": `${apiKey}`
            },
            body: JSON.stringify(body)
        };

        if (logger.checkLogLevel(Logger.LEVEL_DEBUG)) {
            logger.debug(`Sending request to Anthropic with body: ${JSON.stringify(body)}`);
        }

        try {
            const response = await fetch(url, requestOptions);
            const responseJson = await response.json();

            if (responseJson.error?.message) {
                return responseJson.error.message;
            }

            if (logger.checkLogLevel(Logger.LEVEL_DEBUG)) {
                logger.debug(`Anthropic response: ${JSON.stringify(responseJson)}`);
            }

            return responseJson;
            // return await this.#handleResponse(scopedUserDataManager, apiKey, model, data);
        } catch (error) {
            logger.error(`Failed to get answer from Anthropic: ${error}`);
            return error;
        }
    }

    isFunctionCallRequest(responseJson) {
        return responseJson?.stop_reason === "tool_use";
    }

    async handleFunctionCallRequest(scopedUserDataManager, responseJson, getNextResponseCallback) {
        const content = responseJson.content;
        const messageContents = this.#parseMessageContent(content)
        await scopedUserDataManager.addMessageToHistory(new Message("assistant", messageContents));

        const toolCallRequests = [];

        content.forEach(contentElement => {
            if (contentElement.type !== "tool_use") {
                return;
            }

            logger.debug(`Handling function call: ${JSON.stringify(contentElement)}`);
            const tool = this.#determineTool(contentElement);
            if (!tool) {
                throw new Error(`Failed to handle tool call: ${JSON.stringify(contentElement)}`);
            }

            toolCallRequests.push(tool.internal.execute(contentElement.input)
                .then(toolResponseJson => {
                    if (toolResponseJson.error) {
                        return new FunctionCallResultContent(contentElement.id, toolResponseJson.error);
                    }

                    const filteredResponse = tool.internal.getFilteredResponse(toolResponseJson);
                    return new FunctionCallResultContent(contentElement.id, (typeof filteredResponse !== "string") ? JSON.stringify(filteredResponse) : filteredResponse);
                }));
        });

        // wait for all tool calls to finish
        let toolCallResults = await Promise.all(toolCallRequests);
        await scopedUserDataManager.addMessageToHistory(new Message("user", toolCallResults));
        return getNextResponseCallback();
    }

    async handleResponse(scopedUserDataManager, responseJson) {
        const messageContents = this.#parseMessageContent(responseJson.content)
        await scopedUserDataManager.addMessageToHistory(new Message("assistant", messageContents));

        // return last content element
        return messageContents[messageContents.length - 1].getText();
    }

    /**
     *
     * @param contentElement {{type: string, id: string, name: string, input: object}}
     * @return {object}
     */
    #determineTool(contentElement) {
        for (const tool of this.tools) {
            if (contentElement.name === tool.api.name) {
                logger.debug(`Calling tool: ${tool.api.name}`);
                return tool;
            }
        }
    }

    /**
     * Convert generic message to Anthropic message
     *
     * @param message {Message}
     * @return {AnthropicMessage}
     */
    #toAnthropicMessage(message) {
        const anthropicMessage = new AnthropicMessage(message.getRole());

        message.content.forEach(contentElement => {

            if (contentElement instanceof TextContent) {
                anthropicMessage.addContent({type: contentElement.getType(), text: contentElement.getText()});
            } else if (contentElement instanceof FunctionCallRequestContent) {
                anthropicMessage.addContent({
                    type: "tool_use",
                    id: contentElement.getId(),
                    name: contentElement.getFunctionName(),
                    input: contentElement.getFunctionArguments()
                });
            } else if (contentElement instanceof FunctionCallResultContent) {
                anthropicMessage.addContent({
                    type: "tool_result",
                    tool_use_id: contentElement.getId(),
                    content: contentElement.getContent()
                });
            }
        });

        return anthropicMessage;
    }

    /**
     * Content array in Anthropic responses can contain different types of content elements.
     * This method parses the content array and creates MessageContent objects.
     *
     * @param content
     * @return {[MessageContent]}
     */
    #parseMessageContent(content) {
        const messageContents = [];
        content.forEach(contentElement => {
            const contentType = contentElement.type;
            switch (contentType) {
                case "text":
                    messageContents.push(new TextContent(contentElement.text));
                    break;
                case "tool_use":
                    messageContents.push(new FunctionCallRequestContent(contentElement.id, contentElement.functionType, contentElement.name, contentElement.input));
                    break;
            }
        });
        return messageContents;
    }
}