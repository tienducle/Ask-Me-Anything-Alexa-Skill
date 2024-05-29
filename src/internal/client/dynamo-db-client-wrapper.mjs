import {CreateTableCommand, DynamoDBClient, ListTablesCommand} from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand} from "@aws-sdk/lib-dynamodb";
import {Logger} from "../logger.mjs";

const logger = new Logger('DynamoDbClientWrapper', process.env.LOG_LEVEL_DYNAMO_DB_CLIENT_WRAPPER);

export class DynamoDbClientWrapper {

    constructor(config) {
        this.partitionKeyName = config.partitionKeyName ? config.partitionKeyName : 'id';
        this.attributesName = config.attributesName ? config.attributesName : 'attributes';

        const clientConfig = {};
        if (config.region) {
            clientConfig.region = config.region;
        }
        if (config.endpoint) {
            clientConfig.endpoint = config.endpoint;
        }

        this.dynamoDBClient = config.dynamoDBClient ? config.dynamoDBClient : new DynamoDBClient(clientConfig);
        this.documentClient = DynamoDBDocumentClient.from(this.dynamoDBClient);
    }

    async createTable(tableName, keySchemaList, attributeDefinitionList, provisionedThroughput) {
        const createTableCommand = new CreateTableCommand({
            TableName: tableName,
            KeySchema: keySchemaList,
            AttributeDefinitions: attributeDefinitionList,
            ProvisionedThroughput: provisionedThroughput ? provisionedThroughput : {
                ReadCapacityUnits: 5, WriteCapacityUnits: 5
            }
        });
        await this.dynamoDBClient.send(createTableCommand).catch((error) => {
            logger.error(`Could not create table (${tableName}): ${error.message}`);
        });
    }

    async listTables() {
        const listTablesCommand = new ListTablesCommand({});
        return this.dynamoDBClient.send(listTablesCommand);
    }

    async putItem(tableName, item) {
        const putCommand = new PutCommand({
            TableName: tableName,
            Item: item
        });
        return this.documentClient.send(putCommand);
    }

    async updateItem(tableName, keyName, keyValue, updateExpression, expressionAttributeNames, expressionAttributeValues) {
        const updateCommand = {
            TableName: tableName,
            Key: {
                [keyName]: keyValue
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues
        };
        return this.documentClient.send(new UpdateCommand(updateCommand));
    }

    async getItem(tableName, keyName, keyValue) {
        const getCommand = new GetCommand({
            TableName: tableName, Key: {
                [keyName]: keyValue
            }
        });
        return this.documentClient.send(getCommand);
    }

}



