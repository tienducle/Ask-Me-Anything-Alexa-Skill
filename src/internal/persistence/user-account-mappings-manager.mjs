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

export class UserAccountMappingsManager {

    constructor(dynamoDbClientWrapper) {
        this.dynamoDbClientWrapper = dynamoDbClientWrapper;
    }

    generateUserPassword(userId) {
        // generate password from userId + salt
        const passwordLong = simplifiedPasswordEncoding.encode(Buffer.from(userId + PASSWORD_SALT))
        // shorten password for convenience
        return passwordLong.slice(0, 16);
    }

    async createAccountMapping(userId, hashedUserId) {
        logger.debug("Creating account mapping")
        const usernameSaltHash = crypto.createHash('sha512').update(hashedUserId + USERNAME_SALT).digest('hex');
        const usernameIdPart = BigInt('0x' + usernameSaltHash).toString().slice(0, 7);
        let username;
        let validUsername = false;

        logger.debug("Obtaining available username")
        while (validUsername === false) {
            // random number 4 digits only
            username = usernameIdPart + "#" + Math.floor(1000 + Math.random() * 9000);
            const usernameMapping = await this.dynamoDbClientWrapper.getItem(DYNAMO_DB_TABLE_NAME, DYNAMO_DB_PARTITION_KEY_NAME, username);
            if (!usernameMapping.Item) {
                validUsername = true;
            }
        }

        logger.debug("Generating user password")
        const userPassword = this.generateUserPassword(userId);

        // Now create username to userId mapping entry
        // The password hash needs to use the short userPassword
        // On the website, the user will enter only username and short password for updating api key
        // use default rounds here since we only store a userId and the only thing you can do is blindly update the api key
        const usernameHash = crypto.createHash('sha512').update(username).digest('hex');
        const passwordHash = bcrypt.hashSync(userPassword, 10)

        logger.debug("Encrypting userId")
        // derive a password from userId and inputPassword
        const encryptedUserId = CryptoWrapper.encrypt(username + userPassword + ENCRYPTED_USER_ID_SALT, userId);

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
     *
     * @param usernameHash {string}
     * @return {Promise<UserAccountMapping>}
     */
    async getAccountMapping(usernameHash) {
        const usernameMapping = await this.dynamoDbClientWrapper.getItem(DYNAMO_DB_TABLE_NAME, DYNAMO_DB_PARTITION_KEY_NAME, usernameHash);
        return new UserAccountMapping(usernameMapping?.Item);
    }

}