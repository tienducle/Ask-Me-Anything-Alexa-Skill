import Environment from "../../../environment.mjs";
import LocaleService from "../../locale-service.mjs";
import {Logger} from "../../logger.mjs";
import {Tools} from "./tools/tools.mjs";
import {Message} from "../../model/message.mjs";

const logger = new Logger('OpenAiService', process.env.LOG_LEVEL_OPEN_AI_SERVICE);
const API_KEY = Environment.openAiApiKey
const MODEL = Environment.openAiModel

const API_HOSTNAME = 'api.openai.com';
const API_VERSION = 'v1';
const API_BASE_PATH_CHAT_COMPLETIONS = '/chat/completions';

const SYSTEM_MESSAGE = {
    role: "system", content: `You are a helpful assistant.
The user will ask you questions and you will provide answers in the same language that the user uses.
Be precise and informative.
Your answers shouldn't be too long unless the user asks for more details.
Your answer text will be read by Alexa and shown to the user on an Amazon Echo Show device.
If you need up-to-date information, you can use the ${Tools.WebSearchTool.api.function.name} tool. Do not respond with URLs, instead use the get_webpage_content tool to retrieve the content of a web page and extract the necessary information for the user.
Do not use the web search tool for general knowledge questions, only for up-to-date information.`
}

export class OpenAiService {

    constructor() {
        this.tools = [Tools.CurrentDateTimeTool, Tools.WebSearchTool, Tools.WebContentTool];
    }

    /**
     *
     * @param scopedUserDataManager {ScopedUserDataManager}
     * @param query {string}
     * @param locale {string}
     * @return {Promise<string>}
     */
    async getAnswer(scopedUserDataManager, query, locale) {

        const messageHistory = await scopedUserDataManager.getMessageHistory();
        this.cleanupUnhandledUserRequest(messageHistory);
        this.cleanupUnhandledToolCalls(messageHistory);

        return this.getAnswerFromChatCompletions(scopedUserDataManager, new Message("user", query), locale);
    }

    /**
     * Workarounds because OpenAI rejects requests with malformed message history,
     * i.e. previous conversation was aborted due to any reason
     * @param messages {Message[]}
     */
    cleanupUnhandledUserRequest(messages) {
        if (messages.length === 0) {
            return;
        }

        // last message in history was from user, but without any response from assistant
        if (messages[messages.length - 1].role === "user") {
            messages.pop();
        }
    }

    /**
     * Workarounds because OpenAI rejects requests with malformed message history
     * i.e. previous conversation was aborted due to any reason
     * @param messages {Message[]}
     */
    cleanupUnhandledToolCalls(messages) {
        if (messages.length === 0) {
            return;
        }

        // last message in history was from tool call, but without any response from assistant
        if (messages[messages.length - 1].role === "tool") {
            messages.pop();
            return this.cleanupUnhandledToolCalls(messages);
        }

        // last message in history was tool call from assistant, but didn't receive a result
        if (messages[messages.length - 1].tool_calls?.length > 0) {
            messages.pop();
            return this.cleanupUnhandledToolCalls(messages);
        }
    }

    /**
     *
     * @param scopedUserDataManager {ScopedUserDataManager}
     * @param nextMessage the next message to be sent
     * @return {Promise<string>}
     */
    async getAnswerFromChatCompletions(scopedUserDataManager, nextMessage) {
        const url = `https://${API_HOSTNAME}/${API_VERSION}${API_BASE_PATH_CHAT_COMPLETIONS}`
        const apiKey = await scopedUserDataManager.getApiKey();
        if (!apiKey) {
            logger.warn(`Using default OpenAI API key`);
        }
        const effectiveApiKey = apiKey || API_KEY;

        const headers = {
            'Content-Type': 'application/json', 'Authorization': `Bearer ${effectiveApiKey}`
        };

        const messages = [SYSTEM_MESSAGE, ...await scopedUserDataManager.getMessageHistory(), nextMessage];

        await scopedUserDataManager.addMessageToHistory(nextMessage);

        const body = {
            messages: messages,
            tools: this.tools.map((tool) => tool.api),
            "temperature": 0.7,
            "model": MODEL,
            "n": 1,
            "max_tokens": 4000
        };

        const options = {
            method: 'POST', headers: headers, body: JSON.stringify(body)
        };

        if (logger.checkLogLevel(Logger.LEVEL_DEBUG)) {
            logger.debug(`Sending request to OpenAI with body: ${JSON.stringify(body)}`);
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json();

            if (data.error?.message) {
                return data.error.message;
            }

            if (logger.checkLogLevel(Logger.LEVEL_DEBUG)) {
                logger.debug(`OpenAI response: ${JSON.stringify(data)}`);
            }

            return await this.handleChatCompletionResponse(scopedUserDataManager, apiKey, data);
        } catch (error) {
            logger.error(`Failed to get answer from OpenAI: ${error}`);
            return error;
        }
    }

    async handleChatCompletionResponse(scopedUserDataManager, apiKey, data) {
        const choice = data?.choices[0];

        if (choice?.finish_reason === "tool_calls") {
            return this.handleToolCall(scopedUserDataManager, choice, async (message) => {
                return this.getAnswerFromChatCompletions(scopedUserDataManager, message);
            });
        }

        const result = choice.message.content;
        await scopedUserDataManager.addMessageToHistory(new Message("assistant", result));
        return result;
    }

    /**
     *
     * @param scopedUserDataManager {ScopedUserDataManager}
     * @param choice
     * @param callback {function}
     * @return {Promise<*>}
     */
    async handleToolCall(scopedUserDataManager, choice, callback) {
        const toolCallDetails = choice.message.tool_calls[0];
        logger.debug(`Handling function call: ${JSON.stringify(toolCallDetails)}`);
        if ( choice.message.tool_calls.length > 1 ) {
            logger.warn(`More than one tool call in message: ${JSON.stringify(choice.message)}`);
        }

        const tool = this.determineTool(toolCallDetails);
        if (!tool) {
            throw new Error(`Failed to handle tool call: ${JSON.stringify(toolCallDetails)}`);
        }

        await scopedUserDataManager.addMessageToHistory(new Message("assistant", undefined, [toolCallDetails], undefined, undefined));

        // can the user specify the search engine? or even specify search engine + own api key
        const responseJson = await tool.internal.execute({
            ...JSON.parse(toolCallDetails.function.arguments)
        });

        if (responseJson.error) {
            return new Message("tool", responseJson.error, undefined, toolCallDetails.id, undefined);
        }

        const filteredResponse = tool.internal.getFilteredResponse(responseJson);

        const nextMessage = new Message("tool", JSON.stringify(filteredResponse), undefined, toolCallDetails.id, undefined);
        return callback(nextMessage);
    }

    determineTool(toolCallDetails) {
        for (const tool of this.tools) {
            if (toolCallDetails.function.name === tool.api.function.name) {
                logger.debug(`Calling tool: ${tool.api.function.name}`);
                return tool;
            }
        }
    }
}