import {CreateTableCommand, DynamoDBClient, ListTablesCommand} from "@aws-sdk/client-dynamodb";
import {PartitionKeyGenerators} from "ask-sdk-dynamodb-persistence-adapter";
import {DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb";

/* unused */

export class CustomDynamoDbPersistenceAdapter {

    /**
     *
     * @param config {{tableName: string, partitionKeyName: string, attributesName: string, createTable: boolean, dynamoDBClient: DynamoDBClient, partitionKeyGenerator: PartitionKeyGenerator}}
     */
    constructor(config) {
        this.tableName = config.tableName;
        this.partitionKeyName = config.partitionKeyName ? config.partitionKeyName : 'id';
        this.attributesName = config.attributesName ? config.attributesName : 'attributes';
        this.createTable = config.createTable === true;
        this.dynamoDBClient = config.dynamoDBClient ? config.dynamoDBClient : new DynamoDBClient({});
        this.documentClient = DynamoDBDocumentClient.from(this.dynamoDBClient);
        this.partitionKeyGenerator = config.partitionKeyGenerator ? config.partitionKeyGenerator : PartitionKeyGenerators.userId;

        // create dynamodb table if not exists
        if (this.createTable) {
            const listTablesCommand = new ListTablesCommand({});
            this.dynamoDBClient.send(listTablesCommand).then((response) => {
                if (!response.TableNames.includes(this.tableName)) {
                    const createTableCommand = new CreateTableCommand({
                        TableName: this.tableName, KeySchema: [{
                            AttributeName: this.partitionKeyName, KeyType: 'HASH'
                        }], AttributeDefinitions: [{
                            AttributeName: this.partitionKeyName, AttributeType: 'S'
                        }], ProvisionedThroughput: {
                            ReadCapacityUnits: 5, WriteCapacityUnits: 5
                        }
                    });
                    this.dynamoDBClient.send(createTableCommand).catch((error) => {
                        console.error(`Could not create table (${this.tableName}): ${error.message}`);
                    });
                }
            }).catch((error) => {
                console.error(`Could not list tables: ${error.message}`);
            });
        }
    }


    /**
     *
     * @param requestEnvelope
     * @return {Object}
     */
    async getAttributes(requestEnvelope) {
        const partitionKey = this.partitionKeyGenerator(requestEnvelope);
        const getCommand = new GetCommand({
            TableName: this.tableName, Key: {
                [this.partitionKeyName]: partitionKey
            }
        });

        let response;
        try {
            response = await this.documentClient.send(getCommand);
        } catch (error) {
            throw new Error(`Could not read item (${partitionKey}) from table (${this.tableName}): ${error.message}`);
        }
        if (!response.Item || !Object.keys(response).length) {
            return {};
        } else {
            return response.Item[this.attributesName];
        }
    }

    /**
     *
     * @param requestEnvelope
     * @param attributes
     * @return {Promise<void>}
     */
    async saveAttributes(requestEnvelope, attributes) {
        const partitionKey = this.partitionKeyGenerator(requestEnvelope);

        const putCommand = new PutCommand({
            TableName: this.tableName, Item: {
                [this.partitionKeyName]: partitionKey, [this.attributesName]: attributes,
            },
        });

        try {
            await this.documentClient.send(putCommand);
        } catch (error) {
            throw new Error(`Could not save item (${partitionKey}) to table (${this.tableName}): ${error.message}`);
        }
    }

    /**
     * @param requestEnvelope
     * @return {Promise<void>}
     */
    async deleteAttributes(requestEnvelope) {
        const partitionKey = this.partitionKeyGenerator(requestEnvelope);
        const deleteCommand = new DeleteCommand({
            Key: {
                [this.partitionKeyName]: partitionKey,
            }, TableName: this.tableName,
        });
        try {
            await this.documentClient.send(deleteCommand);
        } catch (error) {
            throw new Error(`Could not delete item (${partitionKey}) from table (${this.tableName}): ${error.message}`);
        }
    }

}