export class UserAccountMapping {

    constructor( data ) {
        this.usernameHash = data?.id ? data.id : data?.usernameHash;
        this.passwordHash = data?.passwordHash;
        this.userIdEncrypted = data?.userIdEncrypted;
    }

    getUsernameHash() {
        return this.usernameHash;
    }

    getPasswordHash() {
        return this.passwordHash;
    }

    getAlexaUserIdEncrypted() {
        return this.userIdEncrypted;
    }

}