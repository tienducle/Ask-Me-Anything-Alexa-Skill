import Alexa from "ask-sdk-core";
import LocaleService from "../internal/locale-service.mjs";
import {Logger} from "../internal/logger.mjs";
import {UserDataManager} from "../internal/persistence/user-data-manager.mjs";

const logger = new Logger('LaunchRequestHandler', process.env.LOG_LEVEL_LAUNCH_REQUEST_HANDLER);

export class LaunchRequestHandler {

    /**
     *
     * @param userDataManager {UserDataManager}
     */
    constructor(userDataManager) {
        this.userDataManager = userDataManager;
    }

    /**
     *
     * @param handlerInput
     * @return {boolean}
     */
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    }

    /**
     *
     * @param handlerInput
     * @return {Response}
     */
    async handle(handlerInput) {
        if (logger.checkLogLevel(Logger.LEVEL_DEBUG)) {
            logger.debug(`Handler input: ${JSON.stringify(handlerInput)}`);
        }

        const locale = handlerInput.requestEnvelope._internal.locale;
        const alexaUserId = Alexa.getUserId(handlerInput.requestEnvelope);

        try {
            const userDataExists = await this.userDataManager.ensureUserDataEntryExists(alexaUserId);
            if (!userDataExists) {
                logger.error('Unable to load user account.');
                return this.respondWithCouldNotCreateUserAccountError(handlerInput);
            }
        } catch (error) {
            logger.error(`Error while ensuring loading user data entry: ${error}`);
            return this.respondWithCouldNotCreateUserAccountError(handlerInput);
        }

        return this.respond(handlerInput, LocaleService.getLocalizedTexts(locale, "handler.launchRequest.welcomeText"));

    }

    respondWithCouldNotCreateUserAccountError(handlerInput) {
        return this.respond(handlerInput, LocaleService.getLocalizedTexts(handlerInput.requestEnvelope._internal.locale, "handler.launchRequest.error.couldNotCreateUserAccount"));
    }

    respond(handlerInput, texts) {
        logger.debug(`Responding with ${JSON.stringify(texts)}`);

        return handlerInput.responseBuilder
            .speak(texts.speechText)
            .reprompt(texts.speechText)
            .withSimpleCard(texts.cardTitle, texts.cardContent)
            .getResponse();
    }
}