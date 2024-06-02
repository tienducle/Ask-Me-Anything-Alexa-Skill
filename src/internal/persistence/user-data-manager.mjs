import Environment from "../../environment.mjs";
import {Logger} from "../logger.mjs";
import {UserData} from "../model/user-data.mjs";
import crypto from "crypto";
import {CryptoWrapper} from "../crypto/crypto-wrapper.mjs";

const DYNAMO_DB_TABLE_NAME = Environment.dynamoDbUserDataTableName;
const DYNAMO_DB_PARTITION_KEY_NAME = Environment.dynamoDbUserDataTablePartitionKeyName;
const UNREGISTERED_USER_USAGE_QUOTA_PER_MONTH = Environment.unregisteredUsersUsageQuotaPerMonth;

const logger = new Logger('UserDataManager', process.env.LOG_LEVEL_USER_DATA_MANAGER);

const USER_DATA_CACHE_TTL = 1000 * 60 * 4; // 4 minutes
const USER_ID_HASH_CACHE_TTL = 1000 * 60 * 60; // 60 minutes
const API_KEY_CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export class UserDataManager {

    constructor(dynamoDbClientWrapper, accountMappingsManager) {
        this.dynamoDbClientWrapper = dynamoDbClientWrapper;
        this.accountMappingsManager = accountMappingsManager;

        // hashedUserId -> { timestamp: 12345, userData: userData }
        this.userDataCache = new Map();

        // userId -> { timestamp: 12345, hashedUserId: hashedUserId }
        this.userIdHashCache = new Map();

        // hashedUserId -> { timestamp: 12345, apiKey: apiKey }
        this.apiKeyCache = new Map();
    }

    /**
     *
     * @param userId
     * @return {UserData}
     */
    async ensureUserDataEntryExists(userId) {
        return (await this.#loadOrCreateUserData(userId) !== undefined);
    }

    /**
     * Create an entry in the account mappings table for the given user id.
     * @param userId
     * @return {Promise<boolean>} true if entry was created successfully, false otherwise
     */
    async registerUserAccountMapping(userId) {
        const userData = await this.#loadOrCreateUserData(userId);
        if (userData.isRegistered()) {
            return true;
        }

        // create account mapping and obtain username
        let username;
        try {
            username = await this.accountMappingsManager.createAccountMapping(userId, userData.getHashedUserId());
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
     * @param userId
     * @return {string}
     */
    getHashedUserId(userId) {
        return this.getHashedUserIdFromCache(userId) || (() => {
            const hash = crypto.createHash('sha512').update(userId).digest('hex');
            this.putHashedUserIdToCache(userId, hash);
            return hash;
        })();
    }

    /**
     * Returns the username of the user specified by the user id.
     *
     * @param userId
     * @return {Promise<string>}
     */
    async getUsername(userId) {
        return (await this.#loadOrCreateUserData(userId)).getUsername();
    }

    /**
     * Returns whether the user specified by the user id is registered.

     * @param userId
     * @return {Promise<boolean>}
     */
    async isUserRegistered(userId) {
        return (await this.#loadOrCreateUserData(userId)).isRegistered();
    }

    /**
     * Returns true if the user specified by the user id has exceeded the usage quota for the current month.
     *
     * @param userId
     * @return {Promise<boolean>}
     */
    async checkUserQuotaExceeded(userId) {
        const userData = await this.#loadOrCreateUserData(userId);
        const currentMonth = new Date().getMonth();
        const usagesByMonth = userData.getUsagesByMonth();
        return usagesByMonth[currentMonth] > UNREGISTERED_USER_USAGE_QUOTA_PER_MONTH;
    }

    /**
     * Increment the current usage count of the user specified by the user id by one.
     * Immediately persists the updated usage count to the database.
     *
     * @param userId {string}
     * @return {Promise<void>}
     */
    async incrementUsageCount(userId) {
        const userData = await this.#loadOrCreateUserData(userId);
        const currentMonth = new Date().getMonth();
        const usagesByMonth = userData.getUsagesByMonth();
        usagesByMonth[currentMonth] = usagesByMonth[currentMonth] + 1;
        // always set usage of next month to 0, be cautious with december though
        usagesByMonth[(currentMonth + 1) % 12] = 0;
        logger.debug("Incrementing usage count for unregistered user to " + usagesByMonth[currentMonth]);
        await this.#updateUserData(userId, userData.getMessageHistory(), userData.getUsagesByMonth());
    }

    /**
     * Returns the API key of the user specified by the user id.
     * If no API key was set, returns undefined.
     *
     * @param userId
     * @return {Promise<string|undefined>}
     */
    async getApiKey(userId) {
        const hashedUserId = this.getHashedUserId(userId);
        let apiKey = this.getApiKeyFromCache(hashedUserId);
        if (apiKey) {
            return apiKey;
        }

        const apiKeyEncrypted = (await this.#loadOrCreateUserData(userId)).getApiKeyEncrypted();
        if (!apiKeyEncrypted) {
            return undefined;
        }

        apiKey = CryptoWrapper.decrypt(userId + hashedUserId + Environment.encryptedApiKeySalt, apiKeyEncrypted);
        this.putApiKeyToCache(hashedUserId, apiKey);
        logger.debug("Cached user API key")
        return apiKey;
    }

    /**
     * Returns the message history of the user specified by the user id.
     *
     * @param userId {string}
     * @return {Promise<{assistant: string, user: string}[]>}
     */
    async getMessageHistory(userId) {
        return (await this.#loadOrCreateUserData(userId)).getMessageHistory();
    }

    /**
     * Add a message pair to the message history of the user specified by the user id.
     * If more than 3 pairs are in the history, the oldest pair is removed.
     *
     * @param userId {string}
     * @param userMessage {string}
     * @param assistantMessage {string}
     * @return {Promise<void>}
     */
    async addMessagePairToHistory(userId, userMessage, assistantMessage) {
        const userData = await this.#loadOrCreateUserData(userId);
        const messageHistory = userData.getMessageHistory();
        messageHistory.push({user: userMessage, assistant: assistantMessage});
        // only keep max 3 pairs
        if (messageHistory.length > 3) {
            messageHistory.shift();
        }
    }

    async endSession(userId) {
        const userData = this.userDataCache.get(this.getHashedUserId(userId))?.userData;
        if ( !userData ) {
            return;
        }
        await this.#updateUserData(userId, userData.getMessageHistory(), userData.getUsagesByMonth());
        logger.debug("Deleting current user data from caches");
        this.userDataCache.delete(this.getHashedUserId(userId));
        this.apiKeyCache.delete(this.getHashedUserId(userId));
        this.userIdHashCache.delete(userId);
    }

    /* Cache actions */

    /**
     * Put user data to the cache.
     * @param hashedUserId
     * @param userData
     */
    putUserDataToCache(hashedUserId, userData) {
        // this.putCacheWithTtl(this.userDataCache, hashedUserId, {userData: userData});
        this.userDataCache.set(hashedUserId, {userData: userData, timestamp: Date.now()});
    }

    /**
     * Put a hashed user id to the cache.
     * @param userId
     * @param hashedUserId
     */
    putHashedUserIdToCache(userId, hashedUserId) {
        // this.putCacheWithTtl(this.userIdHashCache, userId, {hashedUserId: hashedUserId});
        this.userIdHashCache.set(userId, {hashedUserId: hashedUserId, timestamp: Date.now()});
    }

    /**
     * Put an API key to the cache.
     * @param hashedUserId
     * @param apiKey
     */
    putApiKeyToCache(hashedUserId, apiKey) {
        // this.putCacheWithTtl(this.apiKeyCache, hashedUserId, {apiKey: apiKey});
        this.apiKeyCache.set(hashedUserId, {apiKey: apiKey, timestamp: Date.now()});
    }

    /**
     * Return the user data of the given hashed user id from the cache.
     * If the entry in the cache has expired, returns undefined.
     *
     * @param hashedUserId
     * @return {UserData|undefined}
     */
    getUserDataFromCache(hashedUserId) {
        return this.#getFromCacheOrExpire(this.userDataCache, hashedUserId, USER_DATA_CACHE_TTL)?.userData;
    }

    /**
     * Return the hashed user id of the given user id from the cache.
     * If the entry in the cache has expired, returns undefined.
     *
     * @param userId
     * @return {string|undefined}
     */
    getHashedUserIdFromCache(userId) {
        return this.#getFromCacheOrExpire(this.userIdHashCache, userId, USER_ID_HASH_CACHE_TTL)?.hashedUserId;
    }

    /**
     * Return the API key of the given hashed user id from the cache.
     * If the entry in the cache has expired, returns undefined.
     *
     * @param hashedUserId
     * @return {string|undefined}
     */
    getApiKeyFromCache(hashedUserId) {
        return this.#getFromCacheOrExpire(this.apiKeyCache, hashedUserId, API_KEY_CACHE_TTL)?.apiKey;
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
     * @param userId
     * @return {Promise<UserData>}
     */
    async #loadOrCreateUserData(userId) {
        // don't store userId directly, hash it first
        const hashedUserId = this.getHashedUserId(userId);

        let userData = this.getUserDataFromCache(hashedUserId);
        if (userData) {
            return userData;
        }

        // check if user exists
        logger.debug('Request userId was not found in cache, checking if user exists in database');
        const result = await this.dynamoDbClientWrapper.getItem(DYNAMO_DB_TABLE_NAME, DYNAMO_DB_PARTITION_KEY_NAME, hashedUserId);
        if (result?.Item) {
            logger.debug('Found user in database');
            const userData = new UserData({...result.Item});
            this.putUserDataToCache(hashedUserId, userData);
            return userData;
        }

        // if user does not exist, create a new entry
        logger.debug('User not found in database, creating new entry')
        userData = new UserData({
            hashedUserId: hashedUserId,
            registered: false,
            apiKeyEncrypted: "",
            username: "",
            messageHistory: []
        });
        await this.dynamoDbClientWrapper.putItem(DYNAMO_DB_TABLE_NAME, this.#serializeUserDataForDb(userData));
        this.putUserDataToCache(hashedUserId, userData);
        return userData;
    }

    /**
     * Updates the user data in the database with the current message history and current usage counts.
     *
     * @param userId {string}
     * @param messageHistory {Array<{assistant: string, user: string}>}
     * @param usagesByMonth {Array<number>}
     * @return {Promise<*>}
     */
    async #updateUserData(userId, messageHistory, usagesByMonth) {
        const updateExpression = "set #messageHistory = :messageHistory, #usagesByMonth = :usagesByMonth, #lastModified = :lastModified";
        const expressionAttributeNames = {
            "#messageHistory": "messageHistory",
            "#usagesByMonth": "usagesByMonth",
            "#lastModified": "lastModified"
        };
        const expressionAttributeValues = {
            ":messageHistory": messageHistory,
            ":usagesByMonth": usagesByMonth,
            ":lastModified": Date.now()
        };

        return this.dynamoDbClientWrapper.updateItem(DYNAMO_DB_TABLE_NAME, DYNAMO_DB_PARTITION_KEY_NAME,
            this.getHashedUserId(userId), updateExpression, expressionAttributeNames, expressionAttributeValues);
    }

    /**
     * Set the API key in the user data specified by the user id.
     *
     * @param userId {string}
     * @param apiKey {string}
     * @return {Promise<void>}
     */
    async updateApiKey(userId, apiKey) {
        const hashedUserId = this.getHashedUserId(userId);
        const apiKeyEncrypted = apiKey ? CryptoWrapper.encrypt(userId + hashedUserId + Environment.encryptedApiKeySalt, apiKey) : "";

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
            hashedUserId, updateExpression, expressionAttributeNames, expressionAttributeValues);
    }

    /**
     * Serialize user data for DynamoDB.
     * @param userData {UserData}
     * @return {{[p: number]: *, apiKeyEncrypted: (string|*), messageHistory: ([]|*), registered: (Map<string, PluginDefinition>|boolean|*), lastModified, username}}
     */
    #serializeUserDataForDb(userData) {
        return {
            [DYNAMO_DB_PARTITION_KEY_NAME]: userData.getHashedUserId(),
            lastModified: Date.now(),
            registered: userData.isRegistered(),
            apiKeyEncrypted: userData.getApiKeyEncrypted(),
            username: userData.getUsername(),
            messageHistory: userData.getMessageHistory(),
        }
    }
}