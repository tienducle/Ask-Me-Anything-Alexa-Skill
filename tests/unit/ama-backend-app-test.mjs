import {AmaBackendApp} from "../../src/ama-backend-app.mjs";
import {expect} from "chai";
import Environment from "../../src/environment.mjs";
import {DynamoDbClientWrapper} from "../../src/internal/client/dynamo-db-client-wrapper.mjs";
import {UserAccountMappingsManager} from "../../src/internal/persistence/user-account-mappings-manager.mjs";
import {UserDataManager} from "../../src/internal/persistence/user-data-manager.mjs";

describe("AmaBackendApp tests", () => {

    let alexaUserId;
    let hashedAlexaUserId;
    let generatedUsername;
    let generatedUserPassword;
    let userData;
    const apiKey = "some-api-key-to-set-for-test";

    /** @type {UserDataManager} */
    let userDataManager;
    /** @type {UserAccountMappingsManager} */
    let userAccountMappingsManager;

    const ddbConfig = {
        region: "eu-west-1",
        endpoint: "http://localhost:4566"
    };

    before( async function () {
        const tableName_userData = Environment.dynamoDbUserDataTableName;
        const tableName_accountMappings = Environment.dynamoDbAccountMappingsTableName;

        const keySchemaList = [];
        keySchemaList.push({AttributeName: Environment.dynamoDbUserDataTablePartitionKeyName, KeyType: "HASH"});

        const attributeDefinitionList = [];
        attributeDefinitionList.push({AttributeName: Environment.dynamoDbUserDataTablePartitionKeyName, AttributeType: "S"});

        const dynamoDbClientWrapper = new DynamoDbClientWrapper(ddbConfig);

        await dynamoDbClientWrapper.createTable(tableName_userData, keySchemaList, attributeDefinitionList);
        await dynamoDbClientWrapper.createTable(tableName_accountMappings, keySchemaList, attributeDefinitionList);

        userAccountMappingsManager = new UserAccountMappingsManager(dynamoDbClientWrapper);
        userDataManager = new UserDataManager(dynamoDbClientWrapper, userAccountMappingsManager);

        // generate random string for userId
        alexaUserId = Math.random().toString(36);
        await userDataManager.ensureUserDataEntryExists(alexaUserId);
        await userDataManager.registerUserAccountMapping(alexaUserId);

        hashedAlexaUserId = userDataManager.getHashedAlexaUserId(alexaUserId);
        userData = await userDataManager.getUserDataFromCache(hashedAlexaUserId);

        generatedUsername = userData.getUsername();
        generatedUserPassword = userAccountMappingsManager.generateUserPassword(hashedAlexaUserId)

        console.log("Generated alexaUserId for test: " + alexaUserId);
        console.log("Generated username for test: " + generatedUsername);
        console.log("Generated password for test: " + generatedUserPassword);
    } );

    it("verify that request with non-existing user is rejected with 403", async () => {
        const trigger = getTriggerEventPayload("non-existing-user", "some-password", apiKey);
        const app = new AmaBackendApp();

        const response = await app.handle(trigger);
        expect(response.statusCode).to.equal(403);
    });

    it("verify that request with existing user but wrong password is rejected with 403", async () => {
        const trigger = getTriggerEventPayload(generatedUsername, generatedUserPassword + "randomstring", apiKey);
        const app = new AmaBackendApp();

        const response = await app.handle(trigger);
        expect(response.statusCode).to.equal(403);
    });

    it("verify that request with correct credentials successfully sets the api key", async () => {
        let trigger = getTriggerEventPayload(generatedUsername, generatedUserPassword, apiKey);
        const app = new AmaBackendApp();

        let response = await app.handle(trigger);
        expect(response.statusCode).to.equal(204);

        // simulate end session to clear user data from cache
        await userDataManager.endSession(alexaUserId);

        // decrypt password and verify that it is correct
        let decryptedApiKey = await userDataManager.getApiKey(alexaUserId);
        expect(decryptedApiKey).to.equal(apiKey);

        // request to delete api key
        await userDataManager.endSession(alexaUserId);
        trigger = getTriggerEventPayload(generatedUsername, generatedUserPassword, "");
        response = await app.handle(trigger);
        expect(response.statusCode).to.equal(204);

        decryptedApiKey = await userDataManager.getApiKey(alexaUserId);
        expect(decryptedApiKey).to.equal(undefined);
    });

    function getTriggerEventPayload(username, password, apiKey) {

        const usernameBase64 = Buffer.from(username).toString("base64");

        return {
            "resource": "/accounts/{username}/apiKey",
            "path": `/accounts/${usernameBase64}/apiKey`,
            "httpMethod": "PUT",
            "headers": {
                "Authorization": `Basic ${Buffer.from(username + ":" + password).toString("base64")}`,
                "Content-Type": "application/json; charset=utf-8",
                "Host": "hfouzd8r05.execute-api.eu-west-1.amazonaws.com",
                "x-api-key": "abcdefg",
                "X-Forwarded-For": "85.222.134.1, 130.176.0.76",
                "X-Forwarded-Port": "443",
                "X-Forwarded-Proto": "https"
            },
            "pathParameters": {
                "username": usernameBase64
            },
            "body": JSON.stringify({
                apiKey: apiKey ? apiKey : ""
            })
        }
    }

});


