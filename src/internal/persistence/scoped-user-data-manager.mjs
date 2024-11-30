import {Logger} from "../logger.mjs";

const logger = new Logger('ScopedUserDataManager', process.env.LOG_LEVEL_USER_DATA_MANAGER);

/**
 * The scoped user data manager is a wrapper around the user data manager
 * that is scoped to a specific user, allowing access and modification of only that user's data.
 */
export class ScopedUserDataManager {

    /**
     *
     * @param userDataManager {UserDataManager}
     * @param userId {string}
     */
    constructor( userDataManager, userId ) {
        this.userDataManager = userDataManager;
        this.userId = userId;
    }

    /**
     * Returns the API key of the user.
     * If no API key was set, returns undefined.
     *
     * @return {Promise<string|undefined>}
     */
    async getApiKey() {
        return this.userDataManager.getApiKey(this.userId);
    }


    /**
     * Returns the configured LLM service of the user.
     *
     * @return {Promise<string>}
     */
    async getLlmServiceId() {
        return this.userDataManager.getLlmServiceId(this.userId);
    }

    /**
     * Returns the configured LLM model of the user.
     *
     * @return {Promise<string>}
     */
    async getLlmModel() {
        return this.userDataManager.getLlmModel(this.userId);
    }

    /**
     * Returns the message history of the user.
     *
     * @return {Promise<Message[]>}
     */
    async getMessageHistory() {
        return this.userDataManager.getMessageHistory(this.userId);
    }

    /**
     * Add a message pair to the message history of the user.
     * If more than 3 pairs are in the history, the oldest pair is removed.
     *
     * @param message {Message}
     * @return {Promise<void>}
     */
    async addMessageToHistory(message) {
        return this.userDataManager.addMessageToHistory(this.userId, message);
    }
}