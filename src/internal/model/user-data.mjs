import {Message} from "./message.mjs";

export class UserData {

    constructor(data) {
        this.hashedAlexaUserId = data?.id ? data.id : data?.hashedAlexaUserId;
        this.lastModified = data?.lastModified;
        this.registered = data?.registered || false;
        this.username = data?.username || "";
        this.usagesByMonth = data?.usagesByMonth || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.maxMessageHistory = data?.maxMessageHistory || 10
        this.messageHistory = data?.messageHistory?.map((messageSerialized) => {
            const messageParsed = JSON.parse(messageSerialized);
            return new Message(messageParsed.role, messageParsed.content, messageParsed.tool_calls, messageParsed.tool_call_id, messageParsed.refusal);
        }) || [];

        this.gptServiceId = data?.gptServiceId;

        /* OpenAI */
        this.apiKeyEncrypted = data?.apiKeyEncrypted || "";
        this.openAiModel = data?.openAiModel || "";

        /* Google Programmable Search Engine */
        this.googlePseId = data?.googlePseId || "";
        this.googlePseApiKeyEncrypted = data?.googlePseApiKeyEncrypted || "";
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

    getGptServiceId() {
        return this.gptServiceId;
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

    getOpenAiModel() {
        return this.openAiModel;
    }

    getGooglePseId() {
        return this.googlePseId;
    }

    getGooglePseApiKeyEncrypted() {
        return this.googlePseApiKeyEncrypted;
    }
}