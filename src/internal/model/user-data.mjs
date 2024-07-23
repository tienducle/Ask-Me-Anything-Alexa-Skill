export class UserData {

    constructor(data) {
        this.hashedAlexaUserId = data?.id ? data.id : data?.hashedAlexaUserId;
        this.lastModified = data?.lastModified;
        this.registered = data?.registered || false;
        this.apiKeyEncrypted = data?.apiKeyEncrypted;
        this.username = data?.username;
        this.messageHistory = data?.messageHistory || [];
        this.usagesByMonth = data?.usagesByMonth || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
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

    getApiKeyEncrypted() {
        return this.apiKeyEncrypted;
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
     * @return {[{assistant: string, user: string}]}
     */
    getMessageHistory() {
        return this.messageHistory;
    }

    setMessageHistory(messageHistory) {
        this.messageHistory = messageHistory;
    }

}