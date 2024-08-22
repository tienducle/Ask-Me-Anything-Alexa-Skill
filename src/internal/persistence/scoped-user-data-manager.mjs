import {Logger} from "../logger.mjs";

const logger = new Logger('ScopedUserDataManager', process.env.LOG_LEVEL_USER_DATA_MANAGER);

export class ScopedUserDataManager {

    constructor( userDataManager, userId ) {
        this.userDataManager = userDataManager;
        this.userId = userId;
    }

    /**
     * Returns the API key of the user specified by the user id.
     * If no API key was set, returns undefined.
     *
     * @return {Promise<string|undefined>}
     */
    async getApiKey() {
        return this.userDataManager.getApiKey(this.userId);
    }

    /**
     * Returns the message history of the user specified by the user id.
     *
     * @return {Promise<Message[]>}
     */
    async getMessageHistory() {
        return this.userDataManager.getMessageHistory(this.userId);
    }

    /**
     * Add a message pair to the message history of the user specified by the user id.
     * If more than 3 pairs are in the history, the oldest pair is removed.
     *
     * @param message {Message}
     * @return {Promise<void>}
     */
    async addMessageToHistory(message) {
        return this.userDataManager.addMessageToHistory(this.userId, message);
    }
}