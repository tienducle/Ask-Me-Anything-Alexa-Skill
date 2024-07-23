import Environment from "../../environment.mjs";
import baseX from 'base-x';
import bcrypt from 'bcryptjs';
import crypto from "crypto";
import {CryptoWrapper} from "../crypto/crypto-wrapper.mjs";
import {Logger} from "../logger.mjs";
import {UserAccountMapping} from "../model/user-account-mapping.mjs";

const logger = new Logger('UserAccountMappingsManager', process.env.LOG_LEVEL_ACCOUNT_MAPPINGS_MANAGER);
const DYNAMO_DB_TABLE_NAME = Environment.dynamoDbAccountMappingsTableName;
const DYNAMO_DB_PARTITION_KEY_NAME = Environment.dynamoDbAccountMappingsTablePartitionKeyName;
const USERNAME_SALT = Environment.usernameSalt;
const PASSWORD_SALT = Environment.passwordSalt;
const ENCRYPTED_USER_ID_SALT = Environment.encryptedUserIdSalt;

const simplifiedPasswordEncoding = baseX('0123456789abcdefghjkmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ');

/**
 * User account mappings, separated from main user data,
 * due to how DynamoDB partition key is used.
 *
 * When a user wants to register, a username and a simple password is generated from the hashed alexaUserId.
 * The username is then hashed to be used as the partition key in DynamoDB.
 * A password is also generated
 * When the user attempts to update the API key using the website,
 * the username+password will first be matched against the user-account-mappings table.
 * On success,
 */
export class UserAccountMappingsManager {

    constructor(dynamoDbClientWrapper) {
        this.dynamoDbClientWrapper = dynamoDbClientWrapper;
    }

    generateUserPassword(hashedAlexaUserId) {
        // generate password from hashedAlexaUserId + salt
        const passwordLong = simplifiedPasswordEncoding.encode(Buffer.from(hashedAlexaUserId + PASSWORD_SALT))
        // shorten password for convenience
        return passwordLong.slice(0, 16);
    }

    async createAccountMapping(alexaUserId, hashedAlexaUserId) {
        logger.debug("Creating account mapping")
        const usernameSaltHash = crypto.createHash('sha512').update(hashedAlexaUserId + USERNAME_SALT).digest('hex');
        const usernameIdPart = BigInt('0x' + usernameSaltHash).toString().slice(0, 7);
        let username;
        let usernameHash;
        let validUsername = false;

        logger.debug("Obtaining available username")
        while (validUsername === false) {
            // random number 4 digits only
            username = usernameIdPart + "#" + Math.floor(1000 + Math.random() * 9000);
            usernameHash = crypto.createHash('sha512').update(username).digest('hex');
            const usernameMapping = await this.dynamoDbClientWrapper.getItem(DYNAMO_DB_TABLE_NAME, DYNAMO_DB_PARTITION_KEY_NAME, usernameHash);
            if (!usernameMapping.Item) {
                validUsername = true;
            }
        }

        logger.debug("Generating user password")
        const userPassword = this.generateUserPassword(hashedAlexaUserId);

        // Now create username to alexaUserId mapping entry
        // The password hash needs to use the short userPassword
        // On the website, the user will enter only username and short password for updating api key
        const passwordHash = bcrypt.hashSync(userPassword, 10)

        logger.debug("Encrypting alexaUserId")
        // derive a password from alexaUserId and inputPassword
        const encryptedUserId = CryptoWrapper.encrypt(username + userPassword + ENCRYPTED_USER_ID_SALT, alexaUserId);

        logger.debug("Storing account mapping entry in DynamoDB")
        const usernameMappingItem = {
            id: usernameHash,
            userIdEncrypted: encryptedUserId,
            passwordHash: passwordHash
        };

        await this.dynamoDbClientWrapper.putItem(DYNAMO_DB_TABLE_NAME, usernameMappingItem);
        return username;
    }

    /**
     * Get account mapping by username
     * @param username {string}
     * @returns {Promise<UserAccountMapping>}
     */
    async getAccountMappingByUsername(username) {
        return await this.getAccountMapping(this.getHashedUsername(username));
    }

    /**
     * Get account mapping by username hash
     * @param usernameHash {string}
     * @return {Promise<UserAccountMapping>}
     */
    async getAccountMapping(usernameHash) {
        const usernameMapping = await this.dynamoDbClientWrapper.getItem(DYNAMO_DB_TABLE_NAME, DYNAMO_DB_PARTITION_KEY_NAME, usernameHash);
        return new UserAccountMapping(usernameMapping?.Item);
    }

    /**
     * Delete account mapping by username
     * @param username
     * @returns {Promise<*>}
     */
    async deleteAccountMappingByUsername(username) {
        return await this.deleteAccountMapping(this.getHashedUsername(username));
    }

    /**
     * Delete account mapping by username hash
     * @param usernameHash
     * @returns {Promise<*>}
     */
    async deleteAccountMapping(usernameHash) {
        return await this.dynamoDbClientWrapper.deleteItem(DYNAMO_DB_TABLE_NAME, DYNAMO_DB_PARTITION_KEY_NAME, usernameHash);
    }

    getHashedUsername(username) {
        return crypto.createHash('sha512').update(username).digest('hex');
    }
}