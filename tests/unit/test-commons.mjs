import {Logger} from "../../src/internal/logger.mjs";
import {DynamoDbClientWrapper} from "../../src/internal/client/dynamo-db-client-wrapper.mjs";
import {UserAccountMappingsManager} from "../../src/internal/persistence/user-account-mappings-manager.mjs";
import {UserDataManager} from "../../src/internal/persistence/user-data-manager.mjs";
import Environment from "../../src/environment.mjs";

const logger = new Logger("TestCommons", process.env.LOG_LEVEL_TEST_COMMONS);
const ddbConfig = {
    region: "eu-west-1",
    endpoint: "http://localhost:4566"
};

export class TestCommons {


    constructor() {
        logger.debug("Initializing TestCommons");

        this.dynamoDbClientWrapper = new DynamoDbClientWrapper(ddbConfig);
        this.userAccountMappingsManager = new UserAccountMappingsManager(this.dynamoDbClientWrapper);
        this.userDataManager = new UserDataManager(this.dynamoDbClientWrapper, this.userAccountMappingsManager);
    }

    /**
     *
     * @returns {DynamoDbClientWrapper}
     */
    getDynamoDbClientWrapper() {
        return this.dynamoDbClientWrapper;
    }

    /**
     *
     * @returns {UserAccountMappingsManager}
     */
    getUserAccountMappingsManager() {
        return this.userAccountMappingsManager;
    }

    /**
     *
     * @returns {UserDataManager}
     */
    getUserDataManager() {
        return this.userDataManager;
    }

    async resetEnvironment() {
        logger.debug("Resetting environment");

        const tableName_userData = Environment.dynamoDbUserDataTableName;
        const tableName_accountMappings = Environment.dynamoDbAccountMappingsTableName;

        await this.dynamoDbClientWrapper.deleteTable(tableName_userData);
        await this.dynamoDbClientWrapper.deleteTable(tableName_accountMappings);

        const keySchemaList = [];
        keySchemaList.push({AttributeName: Environment.dynamoDbUserDataTablePartitionKeyName, KeyType: "HASH"});

        const attributeDefinitionList = [];
        attributeDefinitionList.push({
            AttributeName: Environment.dynamoDbUserDataTablePartitionKeyName,
            AttributeType: "S"
        });

        await this.dynamoDbClientWrapper.createTable(tableName_userData, keySchemaList, attributeDefinitionList);
        await this.dynamoDbClientWrapper.createTable(tableName_accountMappings, keySchemaList, attributeDefinitionList);
    }

    /**
     * Create a user and return the user data
     *
     * @param alexaUserId
     * @returns {Promise<UserData|undefined>}
     */
    async createUser(alexaUserId) {
        const userId = alexaUserId || Math.random().toString(36);
        const hashedAlexaUserId = this.userDataManager.getHashedAlexaUserId(userId);
        await this.userDataManager.ensureUserDataEntryExists(userId);
        return this.userDataManager.getUserDataFromCache(hashedAlexaUserId);
    }

    /**
     * Create a registered user and return the user data
     * @param alexaUserId
     * @returns {Promise<UserData|undefined>}
     */
    async createRegisteredUser(alexaUserId) {
        const userId = alexaUserId || Math.random().toString(36);
        const userData = await this.createUser(userId);
        await this.userDataManager.registerUserAccountMapping(userId);
        return userData;
    }

    /**
     *
     * @param userData {UserData}
     * @param lastModified {number}
     * @returns {Promise<*>}
     */
    async updateUserData(userData, lastModified) {
        const updateExpression = "set #messageHistory = :messageHistory, #usagesByMonth = :usagesByMonth, #lastModified = :lastModified";
        const expressionAttributeNames = {
            "#messageHistory": "messageHistory",
            "#usagesByMonth": "usagesByMonth",
            "#lastModified": "lastModified"
        };
        const expressionAttributeValues = {
            ":messageHistory": userData.getMessageHistory(),
            ":usagesByMonth": userData.getUsagesByMonth(),
            ":lastModified": lastModified ? lastModified : Date.now()
        };

        return this.dynamoDbClientWrapper.updateItem(
            Environment.dynamoDbUserDataTableName,
            Environment.dynamoDbUserDataTablePartitionKeyName,
            userData.getHashedAlexaUserId(),
            updateExpression,
            expressionAttributeNames,
            expressionAttributeValues);
    }
}

export default new TestCommons();