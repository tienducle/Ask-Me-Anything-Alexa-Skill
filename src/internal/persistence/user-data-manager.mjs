import Environment from "../../environment.mjs";
import {Logger} from "../logger.mjs";
import {UserData} from "../model/user-data.mjs";
import {ScopedUserDataManager} from "./scoped-user-data-manager.mjs";
import crypto from "crypto";
import {CryptoWrapper} from "../crypto/crypto-wrapper.mjs";

const DYNAMO_DB_TABLE_NAME = Environment.dynamoDbUserDataTableName;
const DYNAMO_DB_PARTITION_KEY_NAME = Environment.dynamoDbUserDataTablePartitionKeyName;
const UNREGISTERED_USER_USAGE_QUOTA_PER_MONTH = Environment.unregisteredUsersUsageQuotaPerMonth;

const logger = new Logger('UserDataManager', process.env.LOG_LEVEL_USER_DATA_MANAGER);

const USER_DATA_CACHE_TTL = 1000 * 60 * 4; // 4 minutes
const USER_ID_HASH_CACHE_TTL = 1000 * 60 * 60; // 60 minutes
const API_KEY_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

// 90 days until a user is considered inactive and will be purged
const DAYS_UNTIL_INACTIVE = 90;
const MILLIS_UNTIL_INACTIVE = DAYS_UNTIL_INACTIVE * 24 * 60 * 60 * 1000;

/**
 * User data persistence using DynamoDB.
 *
 * Primary key is a hash of the Alexa-provided userId.
 * The ID identifies the user across all devices,
 * until the skill is removed and re-installed.
 */
export class UserDataManager {

    /**
     *
     * @param dynamoDbClientWrapper {DynamoDbClientWrapper}
     * @param accountMappingsManager {UserAccountMappingsManager}
     */
    constructor(dynamoDbClientWrapper, accountMappingsManager) {
        this.dynamoDbClientWrapper = dynamoDbClientWrapper;
        this.accountMappingsManager = accountMappingsManager;

        // hashedAlexaUserId -> { timestamp: 12345, userData: <userData> }
        /** type {Map<string, {timestamp: number, userData: UserData}>} */
        this.userDataCache = new Map();

        // alexaUserId -> { timestamp: 12345, hashedAlexaUserId: <hashedAlexaUserId> }
        this.hashedAlexaUserIdCache = new Map();

        // hashedAlexaUserId -> { timestamp: 12345, apiKey: <apiKey> }
        this.apiKeyCache = new Map();

        this.scopedUserDataManagerCache = new Map();
    }

    getScopedUserDataManager(userId) {
        if (this.scopedUserDataManagerCache.has(userId)) {
            return this.scopedUserDataManagerCache.get(userId);
        }
        const scopedUserDataManager = new ScopedUserDataManager(this, userId);
        this.scopedUserDataManagerCache.set(userId, scopedUserDataManager);
        return scopedUserDataManager;
    }

    /**
     *
     * @param alexaUserId
     * @return {boolean}
     */
    async ensureUserDataEntryExists(alexaUserId) {
        return (await this.#loadOrCreateUserData(alexaUserId) !== undefined);
    }

    /**
     * Create an entry in the account mappings table for the given user id.
     * @param alexaUserId
     * @return {Promise<boolean>} true if entry was created successfully, false otherwise
     */
    async registerUserAccountMapping(alexaUserId) {
        const userData = await this.#loadOrCreateUserData(alexaUserId);
        if (userData.isRegistered()) {
            return true;
        }

        // create account mapping and obtain username
        let username;
        try {
            username = await this.accountMappingsManager.createAccountMapping(alexaUserId, userData.getHashedAlexaUserId());
        } catch (error) {
            logger.error(`Error while creating account mapping: ${error}`);
            return false;
        }

        // update user data
        userData.setRegistered(true);
        userData.setUsername(username);

        // persist user data
        await this.dynamoDbClientWrapper.putItem(DYNAMO_DB_TABLE_NAME, this.#serializeUserDataForDb(userData));
        return true;
    }

    /**
     * Get the hashed user id for the given user id.
     * If the hashed user id is not in the cache, hash the user id and store it in the cache.
     * @param alexaUserId
     * @return {string}
     */
    getHashedAlexaUserId(alexaUserId) {
        return this.getHashedAlexaUserIdFromCache(alexaUserId) || (() => {
            const hash = crypto.createHash('sha512').update(alexaUserId).digest('hex');
            this.putHashedAlexaUserIdToCache(alexaUserId, hash);
            return hash;
        })();
    }

    /**
     * Returns the username of the user specified by the user id.
     *
     * @param alexaUserId
     * @return {Promise<string>}
     */
    async getUsername(alexaUserId) {
        return (await this.#loadOrCreateUserData(alexaUserId)).getUsername();
    }

    /**
     * Returns whether the user specified by the user id is registered.

     * @param alexaUserId
     * @return {Promise<boolean>}
     */
    async isUserRegistered(alexaUserId) {
        return (await this.#loadOrCreateUserData(alexaUserId)).isRegistered();
    }

    /**
     * Returns true if the user specified by the user id has exceeded the usage quota for the current month.
     *
     * @param alexaUserId
     * @return {Promise<boolean>}
     */
    async checkUserQuotaExceeded(alexaUserId) {
        const userData = await this.#loadOrCreateUserData(alexaUserId);
        const currentMonth = new Date().getMonth();
        const usagesByMonth = userData.getUsagesByMonth();
        return usagesByMonth[currentMonth] > UNREGISTERED_USER_USAGE_QUOTA_PER_MONTH;
    }

    /**
     * Increments the current usage count of the user specified by the user id by one.
     * Immediately persists the updated usage count to the database if the user is not
     * using an own API key. Otherwise, the count is only persisted when the
     * user session ends gracefully (less precise but trade-off for saving DDB costs).
     *
     * @param alexaUserId {string}
     * @param userApiKey {string}
     * @return {Promise<void>}
     */
    async incrementUsageCount(alexaUserId, userApiKey) {
        const userData = await this.#loadOrCreateUserData(alexaUserId);
        const currentMonth = new Date().getMonth();
        const usagesByMonth = userData.getUsagesByMonth();
        usagesByMonth[currentMonth] = usagesByMonth[currentMonth] + 1;
        // always set usage of next month to 0, be cautious with december though
        usagesByMonth[(currentMonth + 1) % 12] = 0;
        logger.debug("Incrementing usage count for unregistered user to " + usagesByMonth[currentMonth]);
        if (!userApiKey) {
            // persist state immediately
            await this.#updateUserData(alexaUserId, userData.getMessageHistory(), userData.getUsagesByMonth());
        }
    }

    /**
     *
     * @param alexaUserId {string} re
     * @return {Promise<string>}
     */
    async getGptServiceId(alexaUserId) {
        return (await this.#loadOrCreateUserData(alexaUserId)).getGptServiceId();
    }

    /**
     * Returns the API key of the user specified by the user id.
     * If no API key was set, returns undefined.
     *
     * @param alexaUserId
     * @return {Promise<string|undefined>}
     */
    async getApiKey(alexaUserId) {
        const hashedAlexaUserId = this.getHashedAlexaUserId(alexaUserId);
        let apiKey = this.getApiKeyFromCache(hashedAlexaUserId);
        if (apiKey) {
            return apiKey;
        }

        const apiKeyEncrypted = (await this.#loadOrCreateUserData(alexaUserId)).getApiKeyEncrypted();
        if (!apiKeyEncrypted) {
            return undefined;
        }

        apiKey = CryptoWrapper.decrypt(alexaUserId + hashedAlexaUserId + Environment.encryptedApiKeySalt, apiKeyEncrypted);
        this.putApiKeyToCache(hashedAlexaUserId, apiKey);
        logger.debug("Cached user API key")
        return apiKey;
    }

    /**
     * Returns the message history of the user specified by the user id.
     *
     * @param alexaUserId
     * @return {Promise<Message[]>}
     */
    async getMessageHistory(alexaUserId) {
        return (await this.#loadOrCreateUserData(alexaUserId)).getMessageHistory();
    }

    /**
     * Add a message pair to the message history of the user specified by the user id.
     * If more than 3 pairs are in the history, the oldest pair is removed.
     *
     * @param alexaUserId {string}
     * @param message {Message}
     * @return {Promise<void>}
     */
    async addMessageToHistory(alexaUserId, message) {
        const userData = await this.#loadOrCreateUserData(alexaUserId);
        const messageHistory = userData.getMessageHistory();
        messageHistory.push(message);

        if (messageHistory.length > userData.getMaxMessageHistory()) {
            messageHistory.shift();

            // workaround for OpenAI
            // when a function call was used, the messages sequence is user, assistant, tool, assistant
            // when the user+assistant message pairs were deleted, the tool message will cause an error
            // because a tool message must be preceded by the assistant message
            if (messageHistory[0].getRole() === 'tool') {
                messageHistory.shift();
            }
        }
    }

    async endSession(alexaUserId) {
        const userData = this.userDataCache.get(this.getHashedAlexaUserId(alexaUserId))?.userData;
        if (!userData) {
            return;
        }
        await this.#updateUserData(alexaUserId, userData.getMessageHistory(), userData.getUsagesByMonth());
        logger.debug("Deleting current user data from caches");
        this.userDataCache.delete(this.getHashedAlexaUserId(alexaUserId));
        this.apiKeyCache.delete(this.getHashedAlexaUserId(alexaUserId));
        this.hashedAlexaUserIdCache.delete(alexaUserId);
    }

    /* Cache actions */

    /**
     * Put user data to the cache.
     * @param hashedAlexaUserId
     * @param userData
     */
    putUserDataToCache(hashedAlexaUserId, userData) {
        // this.putCacheWithTtl(this.userDataCache, hashedAlexaUserId, {userData: userData});
        this.userDataCache.set(hashedAlexaUserId, {userData: userData, timestamp: Date.now()});
    }

    /**
     * Put a hashed user id to the cache.
     * @param alexaUserId
     * @param hashedAlexaUserId
     */
    putHashedAlexaUserIdToCache(alexaUserId, hashedAlexaUserId) {
        // this.putCacheWithTtl(this.userIdHashCache, alexaUserId, {hashedAlexaUserId: hashedAlexaUserId});
        this.hashedAlexaUserIdCache.set(alexaUserId, {hashedAlexaUserId: hashedAlexaUserId, timestamp: Date.now()});
    }

    /**
     * Put an API key to the cache.
     * @param hashedAlexaUserId
     * @param apiKey
     */
    putApiKeyToCache(hashedAlexaUserId, apiKey) {
        // this.putCacheWithTtl(this.apiKeyCache, hashedAlexaUserId, {apiKey: apiKey});
        this.apiKeyCache.set(hashedAlexaUserId, {apiKey: apiKey, timestamp: Date.now()});
    }

    /**
     * Return the user data of the given hashed user id from the cache.
     * If the entry in the cache has expired, returns undefined.
     *
     * This is only meant to be used for testing purposes.
     * Other actions should be performed through this class only,
     * as it encapsulates the database actions when required.
     *
     * @param hashedAlexaUserId
     * @return {UserData|undefined}
     */
    getUserDataFromCache(hashedAlexaUserId) {
        return this.#getFromCacheOrExpire(this.userDataCache, hashedAlexaUserId, USER_DATA_CACHE_TTL)?.userData;
    }

    /**
     * Return the hashed user id of the given user id from the cache.
     * If the entry in the cache has expired, returns undefined.
     *
     * @param alexaUserId
     * @return {string|undefined}
     */
    getHashedAlexaUserIdFromCache(alexaUserId) {
        return this.#getFromCacheOrExpire(this.hashedAlexaUserIdCache, alexaUserId, USER_ID_HASH_CACHE_TTL)?.hashedAlexaUserId;
    }

    /**
     * Return the API key of the given hashed user id from the cache.
     * If the entry in the cache has expired, returns undefined.
     *
     * @param hashedAlexaUserId
     * @return {string|undefined}
     */
    getApiKeyFromCache(hashedAlexaUserId) {
        return this.#getFromCacheOrExpire(this.apiKeyCache, hashedAlexaUserId, API_KEY_CACHE_TTL)?.apiKey;
    }

    /**
     * Get an item from the cache if it exists and has not expired.
     * Otherwise, delete the item from the cache and return undefined.
     *
     * @param cacheMap
     * @param key
     * @param ttl
     * @return {undefined|*}
     */
    #getFromCacheOrExpire(cacheMap, key, ttl) {
        const cacheEntry = cacheMap.get(key);
        if (!cacheEntry) {
            return undefined;
        }

        if (Date.now() - cacheEntry.timestamp > ttl) {
            cacheMap.delete(key);
            return undefined;
        }

        return cacheEntry;
    }

    /* Database actions */

    /**
     * Load user data from cache or database. If user data does not exist, create a new entry.
     * @param alexaUserId
     * @return {Promise<UserData>}
     */
    async #loadOrCreateUserData(alexaUserId) {
        // don't store alexaUserId directly, hash it first
        const hashedAlexaUserId = this.getHashedAlexaUserId(alexaUserId);

        let userData = this.getUserDataFromCache(hashedAlexaUserId);
        if (userData) {
            return userData;
        }

        // check if user exists
        logger.debug('Requested alexaUserId was not found in cache, checking if user exists in database');
        const result = await this.dynamoDbClientWrapper.getItem(DYNAMO_DB_TABLE_NAME, DYNAMO_DB_PARTITION_KEY_NAME, hashedAlexaUserId);
        if (result?.Item) {
            logger.debug('Found user in database');
            const userData = new UserData({...result.Item});
            this.putUserDataToCache(hashedAlexaUserId, userData);
            return userData;
        }

        // if user does not exist, create a new entry
        logger.debug('User not found in database, creating new entry')
        userData = new UserData({
            hashedAlexaUserId: hashedAlexaUserId
        });
        await this.dynamoDbClientWrapper.putItem(DYNAMO_DB_TABLE_NAME, this.#serializeUserDataForDb(userData));
        this.putUserDataToCache(hashedAlexaUserId, userData);
        return userData;
    }

    /**
     * Updates the user data in the database with the current message history and current usage counts.
     *
     * @param alexaUserId {string}
     * @param messageHistory {Message[]}
     * @param usagesByMonth {Array<number>}
     * @return {Promise<*>}
     */
    async #updateUserData(alexaUserId, messageHistory, usagesByMonth) {
        const updateExpression = "set #messageHistory = :messageHistory, #usagesByMonth = :usagesByMonth, #lastModified = :lastModified";
        const expressionAttributeNames = {
            "#messageHistory": "messageHistory",
            "#usagesByMonth": "usagesByMonth",
            "#lastModified": "lastModified"
        };
        const expressionAttributeValues = {
            // ":messageHistory": messageHistory.map((message) => message.serialize()),
            ":messageHistory": messageHistory.map((message) => JSON.stringify(message)),
            ":usagesByMonth": usagesByMonth,
            ":lastModified": Date.now()
        };

        return this.dynamoDbClientWrapper.updateItem(DYNAMO_DB_TABLE_NAME, DYNAMO_DB_PARTITION_KEY_NAME,
            this.getHashedAlexaUserId(alexaUserId), updateExpression, expressionAttributeNames, expressionAttributeValues);
    }

    /**
     * Set the API key in the user data specified by the user id.
     *
     * @param alexaUserId {string}
     * @param apiKey {string}
     * @return {Promise<void>}
     */
    async updateApiKey(alexaUserId, apiKey) {
        const hashedAlexaUserId = this.getHashedAlexaUserId(alexaUserId);
        const apiKeyEncrypted = apiKey ? CryptoWrapper.encrypt(alexaUserId + hashedAlexaUserId + Environment.encryptedApiKeySalt, apiKey) : "";

        const updateExpression = "set #apiKeyEncrypted = :apiKeyEncrypted, #lastModified = :lastModified";
        const expressionAttributeNames = {
            "#apiKeyEncrypted": "apiKeyEncrypted",
            "#lastModified": "lastModified"
        };
        const expressionAttributeValues = {
            ":apiKeyEncrypted": apiKeyEncrypted,
            ":lastModified": Date.now()
        };

        return this.dynamoDbClientWrapper.updateItem(DYNAMO_DB_TABLE_NAME, DYNAMO_DB_PARTITION_KEY_NAME,
            hashedAlexaUserId, updateExpression, expressionAttributeNames, expressionAttributeValues);
    }

    async purgeInactiveUsers() {
        const inactiveUsers = await this.getInactiveUsers();
        if (inactiveUsers.length === 0) {
            return;
        }
        logger.info(`Purging ${inactiveUsers.length} inactive users`);
        await Promise.all(
            inactiveUsers.map(
                async (userData) => {
                    if (userData.isRegistered()) {
                        await this.accountMappingsManager.deleteAccountMappingByUsername(userData.getUsername());
                    }
                    return this.dynamoDbClientWrapper.deleteItem(DYNAMO_DB_TABLE_NAME, DYNAMO_DB_PARTITION_KEY_NAME, userData.getHashedAlexaUserId());
                }
            )
        );
    }

    /**
     * Returns a list of all users that have been inactive for {@link DAYS_UNTIL_INACTIVE} days.
     * @returns {Promise<UserData[]>}
     */
    async getInactiveUsers() {
        const filterExpression = "#lastModified < :timestamp";
        const expressionAttributeNames = {
            "#lastModified": "lastModified"
        };
        const expressionAttributeValues = {
            ":timestamp": Date.now() - MILLIS_UNTIL_INACTIVE
        };

        const result = await this.dynamoDbClientWrapper.scanAll(DYNAMO_DB_TABLE_NAME, filterExpression, expressionAttributeNames, expressionAttributeValues);
        return result.map(item => {
            return new UserData({...item});
        });
    }

    async getAllUsers() {
        const result = await this.dynamoDbClientWrapper.scanAll(DYNAMO_DB_TABLE_NAME);
        return result.map(item => {
            return new UserData({...item});
        });
    }

    /**
     * Serialize user data for DynamoDB.
     * @param userData {UserData}
     * @return {{[p: number]: *, apiKeyEncrypted: (string|*), messageHistoryHelper: (string), registered: (Map<string, PluginDefinition>|boolean|*), lastModified, username}}
     */
    #serializeUserDataForDb(userData) {
        return {
            [DYNAMO_DB_PARTITION_KEY_NAME]: userData.getHashedAlexaUserId(),
            lastModified: Date.now(),
            registered: userData.isRegistered(),
            apiKeyEncrypted: userData.getApiKeyEncrypted(),
            username: userData.getUsername(),
            maxMessageHistory: userData.getMaxMessageHistory(),
            messageHistory: userData.getMessageHistory().map((message) => JSON.stringify(message)),
            // messageHistory: userData.getMessageHistory().map((message) => message.serialize()),
        }
    }
}