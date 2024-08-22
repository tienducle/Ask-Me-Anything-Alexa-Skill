import {DynamoDbClientWrapper} from "../../src/internal/client/dynamo-db-client-wrapper.mjs";
import Environment from "../../src/environment.mjs";
import {Logger} from "../../src/internal/logger.mjs";

const logger = new Logger('Common', process.env.LOG_LEVEL_COMMON);

export class Common {

    static ddbConfig = {
        region: "eu-west-1",
        endpoint: "http://localhost:4566"
    };

    static async setup() {

        logger.info("Setting up test environment");

        const tableName_userData = Environment.dynamoDbUserDataTableName;
        const tableName_accountMappings = Environment.dynamoDbAccountMappingsTableName;

        const client = new DynamoDbClientWrapper(this.ddbConfig);

        // check if table already exists
        let tables = await client.listTables();
        if ( tables.TableNames.length !== 0 )
        {
            logger.info("DDB tables already exist, skipping table creation");
            return;
        }

        logger.info("Creating DDB tables");
        const keySchemaList = [];
        keySchemaList.push({AttributeName: Environment.dynamoDbUserDataTablePartitionKeyName, KeyType: "HASH"});

        const attributeDefinitionList = [];
        attributeDefinitionList.push({AttributeName: Environment.dynamoDbUserDataTablePartitionKeyName, AttributeType: "S"});

        await client.createTable(tableName_userData, keySchemaList, attributeDefinitionList);
        await client.createTable(tableName_accountMappings, keySchemaList, attributeDefinitionList);

        logger.info("DDB tables created");
    }

}