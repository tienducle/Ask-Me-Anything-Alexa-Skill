import {Message} from "./message/message.mjs";

export class UserData {

    constructor(data) {
        this.hashedAlexaUserId = data?.id ? data.id : data?.hashedAlexaUserId;
        this.lastModified = data?.lastModified;
        this.registered = data?.registered || false;
        this.username = data?.username || "";
        this.usagesByMonth = data?.usagesByMonth || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.maxMessageHistory = data?.maxMessageHistory || 12
        this.messageHistory = data?.messageHistory?.map((messageSerialized) => {
            const messageParsed = JSON.parse(messageSerialized);
            return new Message(messageParsed.role, messageParsed.content);
        }) || [];

        this.apiKeyEncrypted = data?.apiKeyEncrypted || "";
        this.llmServiceId = data?.llmServiceId;
        this.llmModel = data?.llmModel;

        /* Google Programmable Search Engine */
        this.googlePseId = data?.googlePseId || "";
        this.googlePseApiKeyEncrypted = data?.googlePseApiKeyEncrypted || "";

        this.changed = false;
    };

    getHashedAlexaUserId() {
        return this.hashedAlexaUserId;
    }

    getLastModified() {
        return this.lastModified;
    }

    updateLastModified() {
        this.lastModified = Date.now();
    }

    isRegistered() {
        return this.registered;
    }

    setRegistered(registered) {
        this.registered = registered;
    }

    getUsername() {
        return this.username;
    }

    setUsername(username) {
        this.username = username;
    }

    /**
     *
     * @return {*|number[]}
     */
    getUsagesByMonth() {
        return this.usagesByMonth;
    }

    /**
     *
     * @return {number}
     */
    getMaxMessageHistory() {
        return this.maxMessageHistory;
    }

    getLlmServiceId() {
        return this.llmServiceId;
    }

    setLlmServiceId(llmServiceId) {
        this.llmServiceId = llmServiceId;
    }

    getLlmModel() {
        return this.llmModel;
    }

    setLlmModel(llmModel) {
        this.llmModel = llmModel;
    }

    /**
     *
     * @return {Message[]}
     */
    getMessageHistory() {
        return this.messageHistory;
    }

    getApiKeyEncrypted() {
        return this.apiKeyEncrypted;
    }

    setApiKeyEncrypted(apiKeyEncrypted) {
        this.apiKeyEncrypted = apiKeyEncrypted;
    }

    getGooglePseId() {
        return this.googlePseId;
    }

    getGooglePseApiKeyEncrypted() {
        return this.googlePseApiKeyEncrypted;
    }

    setHasChanged()
    {
        this.changed = true;
    }

    hasChanged() {
        return this.changed;
    }
}