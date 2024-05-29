export class UserData {

    constructor(data) {
        this.hashedUserId = data?.id ? data.id : data?.hashedUserId;
        this.lastModified = data?.lastModified;
        this.registered = data?.registered || false;
        this.apiKeyEncrypted = data?.apiKeyEncrypted;
        this.username = data?.username;
        this.messageHistory = data?.messageHistory || [];
        this.usagesByMonth = data?.usagesByMonth || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    };

    getHashedUserId() {
        return this.hashedUserId;
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