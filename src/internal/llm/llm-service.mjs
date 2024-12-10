import {Message} from "../model/message/message.mjs";
import {Logger} from "../logger.mjs";

const logger = new Logger('LlmService', process.env.LOG_LEVEL_LLM_SERVICE);

export class LlmService {

    /**
     *
     * @param apiKey {string} provided apiKey to use if user does not configure a custom one
     * @param defaultModel {string} provided model to use if user does not configure a custom one
     */
    constructor(apiKey, defaultModel) {
        this.apiKey = apiKey;
        this.defaultModel = defaultModel;
    }

    /**
     *
     * @param scopedUserDataManager {ScopedUserDataManager}
     * @param query
     * @param locale
     * @return {Promise<void>}
     */
    async getAnswer(scopedUserDataManager, query, locale) {
        const messageHistory = await scopedUserDataManager.getMessageHistory();
        const effectiveApiKey = await this.#getApiKey(scopedUserDataManager);
        const effectiveModel = await this.#getModel(scopedUserDataManager)
        this.cleanupAbortedSession(messageHistory);
        return await this.#getNextResponse(scopedUserDataManager, effectiveApiKey, effectiveModel, messageHistory, new Message("user", query));
    }

    async #getNextResponse(scopedUserDataManager, apiKey, model, messageHistory, nextMessage)
    {
        const messages = await this.initializeMessages(scopedUserDataManager, messageHistory, nextMessage);
        const responseJson = await this.getNextResponse(apiKey, model, messages);
        return this.#handleResponse(scopedUserDataManager, apiKey, model, messageHistory, responseJson);
    }

    async #handleResponse(scopedUserDataManager, apiKey, model, messageHistory, responseJson) {
        if ( this.isFunctionCallRequest(responseJson) ) {
            return this.handleFunctionCallRequest(scopedUserDataManager, responseJson, async () => {
                return this.#getNextResponse(scopedUserDataManager, apiKey, model, messageHistory);
            });
        }

        return this.handleResponse( scopedUserDataManager, responseJson );
    }

    /**
     *
     * @param messages {[Message]}
     */
    cleanupAbortedSession(messages) {
        throw new Error("Not implemented");
    }

    /**
     *
     * @param messages {[Message]}
     */
    sanitizeHeadMessages(messages) {
        throw new Error("Not implemented");
    }

    /**
     *
     * @param scopedUserDataManager {ScopedUserDataManager}
     * @return {Promise<string>}
     */
    async #getApiKey(scopedUserDataManager) {
        const userApiKey = await scopedUserDataManager.getApiKey();
        if (!userApiKey) {
            logger.warn(`Using default API key`);
        }
        return userApiKey || this.apiKey;
    }

    /**
     *
     * @param scopedUserDataManager {ScopedUserDataManager}
     * @return {Promise<string>}
     */
    async #getModel(scopedUserDataManager) {
        const model = await scopedUserDataManager.getLlmModel();
        return model || this.defaultModel;
    }

    /**
     * Initialize messages for the given user.
     *
     * @param scopedUserDataManager {ScopedUserDataManager}
     * @param messageHistory {[Message]}
     * @param nextMessage {Message}
     *
     * @return {Promise<[LlmMessage]>}
     */
    async initializeMessages(scopedUserDataManager, messageHistory, nextMessage) {
        throw new Error("Not implemented");
    }

    async getNextResponse(apiKey, model, messages) {
        throw new Error("Not implemented");
    }

    isFunctionCallRequest(responseJson) {
        throw new Error("Not implemented");
    }

    async handleFunctionCallRequest(scopedUserDataManager, responseJson, getNextResponseCallback) {
        throw new Error("Not implemented");
    }

    async handleResponse( scopedUserDataManager, responseJson ) {
        throw new Error("Not implemented");
    }
}