export class Environment {

    constructor() {
        this._dynamoDbRegion = process.env.DYNAMO_DB_REGION;
        this._dynamoDbEndpointOverride = process.env.DYNAMO_DB_ENDPOINT_OVERRIDE;

        this._dynamoDbUserDataTableName = process.env.DYNAMO_DB_USER_DATA_TABLE_NAME;
        this._dynamoDbUserDataTablePartitionKeyName = process.env.DYNAMO_DB_USER_DATA_TABLE_PARTITION_KEY_NAME;

        this._dynamoDbAccountMappingsTableName = process.env.DYNAMO_DB_ACCOUNT_MAPPINGS_TABLE_NAME;
        this._dynamoDbAccountMappingsTablePartitionKeyName = process.env.DYNAMO_DB_ACCOUNT_MAPPINGS_TABLE_PARTITION_KEY_NAME;

        this._usernameSalt = process.env.USERNAME_SALT;
        this._passwordSalt = process.env.PASSWORD_SALT;
        this._encryptedUserIdSalt = process.env.ENCRYPTED_USER_ID_SALT;
        this._encryptedApiKeySalt = process.env.ENCRYPTED_API_KEY_SALT;

        this._gptOpenAiApiKey = process.env.GPT_OPEN_AI_API_KEY;
        this._gptOpenAiModel = process.env.GPT_OPEN_AI_MODEL || 'gpt-4o';
        this._unregisteredUsersUsageQuotaPerMonth = process.env.UNREGISTERED_USERS_USAGE_QUOTA_PER_MONTH || 50;
    }

    get dynamoDbRegion() {
        return this._dynamoDbRegion;
    }

    get dynamoDbEndpointOverride() {
        return this._dynamoDbEndpointOverride;
    }

    get dynamoDbUserDataTableName() {
        return this._dynamoDbUserDataTableName;
    }

    get dynamoDbUserDataTablePartitionKeyName() {
        return this._dynamoDbUserDataTablePartitionKeyName;
    }

    get dynamoDbAccountMappingsTableName() {
        return this._dynamoDbAccountMappingsTableName;
    }

    get dynamoDbAccountMappingsTablePartitionKeyName() {
        return this._dynamoDbAccountMappingsTablePartitionKeyName;
    }

    get usernameSalt() {
        return this._usernameSalt;
    }

    get passwordSalt() {
        return this._passwordSalt;
    }

    get encryptedUserIdSalt() {
        return this._encryptedUserIdSalt;
    }

    get encryptedApiKeySalt() {
        return this._encryptedApiKeySalt;
    }

    get gptOpenAiApiKey() {
        return this._gptOpenAiApiKey;
    }

    get gptOpenAiModel() {
        return this._gptOpenAiModel;
    }

    get unregisteredUsersUsageQuotaPerMonth() {
        return this._unregisteredUsersUsageQuotaPerMonth;
    }
}

export default new Environment();