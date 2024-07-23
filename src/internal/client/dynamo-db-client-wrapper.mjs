import {CreateTableCommand, DeleteTableCommand, DynamoDBClient, ListTablesCommand} from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, ScanCommand, DeleteCommand
} from "@aws-sdk/lib-dynamodb";
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

    async createTable(tableName, keySchemaList, attributeDefinitionList, globalSecondaryIndexes, provisionedThroughput) {
        const createTableCommand = new CreateTableCommand({
            TableName: tableName,
            KeySchema: keySchemaList,
            AttributeDefinitions: attributeDefinitionList,
            GlobalSecondaryIndexes: globalSecondaryIndexes ? globalSecondaryIndexes : undefined,
            ProvisionedThroughput: provisionedThroughput ? provisionedThroughput : {
                ReadCapacityUnits: 5, WriteCapacityUnits: 5
            },
        });
        await this.dynamoDBClient.send(createTableCommand).catch((error) => {
            logger.error(`Could not create table (${tableName}): ${error.message}`);
        });
    }

    async listTables() {
        const listTablesCommand = new ListTablesCommand({});
        return this.dynamoDBClient.send(listTablesCommand);
    }

    async deleteTable(tableName) {
        const deleteTableCommand = new DeleteTableCommand({
            TableName: tableName
        });
        return this.dynamoDBClient.send(deleteTableCommand);
    }

    async purgeTable(tableName) {
        const items = await this.scanAll(tableName);

        for (const item of items) {
            const deleteCommand = new DeleteCommand({
                TableName: tableName, Key: {
                    [this.partitionKeyName]: item[this.partitionKeyName]
                }
            });
            await this.documentClient.send(deleteCommand);
        }
    }

    async putItem(tableName, item) {
        const putCommand = new PutCommand({
            TableName: tableName, Item: item
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

    async deleteItem(tableName, keyName, keyValue) {
        const deleteCommand = new DeleteCommand({
            TableName: tableName, Key: {
                [keyName]: keyValue
            }
        });
        return this.documentClient.send(deleteCommand);
    }

    /**
     * Scan all items in a table
     * @param tableName {string}
     * @param filterExpression
     * @param expressionAttributeNames
     * @param expressionAttributeValues
     * @param pointer
     * @returns {Promise<*[]|*>}
     */
    async scanAll(tableName, filterExpression, expressionAttributeNames, expressionAttributeValues, pointer) {

        const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: filterExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ExclusiveStartKey: pointer
        });

        try {
            const data = await this.documentClient.send(scanCommand);
            return data.LastEvaluatedKey ? [...data.Items, ...await this.scanAll(tableName, data.LastEvaluatedKey, filterExpression, expressionAttributeNames, expressionAttributeValues)] : data.Items;

        } catch (error) {
            console.log("An error occurred while executing SCAN command:", error);
        }

        return [];
    }
}



