import {Logger} from "./internal/logger.mjs";
import {Accounts} from "./internal/controller/accounts.mjs";
import {DynamoDbClientWrapper} from "./internal/client/dynamo-db-client-wrapper.mjs";
import Environment from "./environment.mjs";
import {Errors} from "./internal/controller/errors.mjs";
import {UserDataManager} from "./internal/persistence/user-data-manager.mjs";
import {UserAccountMappingsManager} from "./internal/persistence/user-account-mappings-manager.mjs";

/**
 * LOG_LEVEL: error|debug
 */
const logger = new Logger("AmaBackendApp", process.env.LOG_LEVEL_APP);

export class AmaBackendApp {

    /**
     */
    constructor() {
        logger.debug(`Initializing app`);
        const dynamoDbClientConfig = {
            region: Environment.dynamoDbRegion
        }

        if (Environment.dynamoDbEndpointOverride) {
            dynamoDbClientConfig.endpoint = Environment.dynamoDbEndpointOverride;
        }

        this.dynamoDbClientWrapper = new DynamoDbClientWrapper(dynamoDbClientConfig);
        this.accountMappingsManager = new UserAccountMappingsManager(this.dynamoDbClientWrapper);
        this.userDataManager = new UserDataManager(this.dynamoDbClientWrapper, this.accountMappingsManager);
        this.accountsResource = new Accounts(this.userDataManager, this.accountMappingsManager);
    }

    /**
     * Forwards the trigger payload to Home Assistant and returns its response.
     *
     * @param lambdaTriggerPayload
     * @param context
     * @return {Promise<*>}
     */
    async handle(lambdaTriggerPayload, context) {

        if (logger.checkLogLevel(Logger.LEVEL_DEBUG)) {
            logger.debug(`Lambda triggered by: '${JSON.stringify(lambdaTriggerPayload)}'`);
        }

        const resource = lambdaTriggerPayload.resource;
        // if ( resource === "/accounts" ) {
        //     return this.accountsResource.accounts_post(lambdaTriggerPayload);
        // }

        if ( resource === "/accounts/{username}/apiKey" ) {
            return this.accountsResource.accounts_accountId_apiKey_put(lambdaTriggerPayload);
        }

        // CloudWatch trigger
        if ( lambdaTriggerPayload.command === "PurgeInactiveUsers" ) {
            logger.info(`Purging inactive users`);
            return this.userDataManager.purgeInactiveUsers();
        }

        return {
            statusCode: 200
        }

    }
}