import Alexa from 'ask-sdk-core';

import {LaunchRequestHandler} from './handler/launch-request-handler.mjs';
import {CancelStopIntentHandler} from './handler/cancel-stop-intent-handler.mjs';
import {HelpIntentHandler} from './handler/help-intent-handler.mjs';
import {SessionEndedRequestHandler} from './handler/session-ended-request-handler.mjs';
import {CustomErrorHandler} from './handler/custom-error-handler.mjs';

import {AskQuestionIntentHandler} from './handler/ask-question-intent-handler.mjs';
import {RegistrationIntentHandler} from './handler/registration-intent-handler.mjs';

import {Logger} from "./internal/logger.mjs";
import Environment from "./environment.mjs";
import {DynamoDbClientWrapper} from "./internal/client/dynamo-db-client-wrapper.mjs";
import {UserDataManager} from "./internal/persistence/user-data-manager.mjs";
import {UserAccountMappingsManager} from "./internal/persistence/user-account-mappings-manager.mjs";

/**
 * LOG_LEVEL: error|debug
 */
const logger = new Logger("AmaApp", process.env.LOG_LEVEL_APP);

export class AmaApp {

    /**
     */
    constructor() {
        logger.debug(`Initializing app`);

        const dynamoDbClientConfig = {
            region: Environment.dynamoDbRegion
        }

        if (Environment.dynamoDbEndpointOverride) {
            logger.debug(`Using DynamoDB endpoint override: ${Environment.dynamoDbEndpointOverride}`);
            dynamoDbClientConfig.endpoint = Environment.dynamoDbEndpointOverride;
        }

        this.dynamoDbClientWrapper = new DynamoDbClientWrapper(dynamoDbClientConfig);
        this.accountMappingsManager = new UserAccountMappingsManager(this.dynamoDbClientWrapper);
        this.userDataManager = new UserDataManager(this.dynamoDbClientWrapper, this.accountMappingsManager);

        this.skill = Alexa.SkillBuilders.custom()
            .addRequestHandlers(
                new LaunchRequestHandler(this.userDataManager, this.accountMappingsManager),
                new AskQuestionIntentHandler(this.userDataManager),
                new RegistrationIntentHandler(this.userDataManager, this.accountMappingsManager),
                new SessionEndedRequestHandler(this.userDataManager),
                new CancelStopIntentHandler(this.userDataManager),
                HelpIntentHandler
            )
            .addErrorHandlers(CustomErrorHandler)
            .create();
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
            // logger.debug(`Context: '${JSON.stringify(context)}'`);
        }

        lambdaTriggerPayload._internal = {
            locale: lambdaTriggerPayload.request.locale.split("-")[0],
        };

        logger.debug(`Locale: ${lambdaTriggerPayload._internal.locale}`);

        const response = await this.skill.invoke(lambdaTriggerPayload, context);

        if (logger.checkLogLevel(Logger.LEVEL_DEBUG)) {
            logger.debug(`Response: ${JSON.stringify(response)}`);
        }

        return response;
    }

}