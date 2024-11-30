import Alexa from "ask-sdk-core";
import Environment from "../environment.mjs";
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
     * SDK-required function to check if the handler can handle the request.
     *
     * @param handlerInput
     * @return {boolean}
     */
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    }

    /**
     * SDK-required function to handle the request.
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

        const llmService = await this.userDataManager.getLlmServiceId(alexaUserId);
        const llmModel = await this.userDataManager.getLlmModel(alexaUserId);
        return this.respond(handlerInput, LocaleService.getLocalizedTexts(locale, "handler.launchRequest.welcomeText"), llmService, llmModel);
    }

    respondWithCouldNotCreateUserAccountError(handlerInput) {
        return this.respond(handlerInput, LocaleService.getLocalizedTexts(handlerInput.requestEnvelope._internal.locale, "handler.launchRequest.error.couldNotCreateUserAccount"));
    }

    respond(handlerInput, texts, llmService, llmModel) {
        logger.debug(`Responding with ${JSON.stringify(texts)}`);

        const llmInfo = `Service: ${llmService || Environment.defaultLlmServiceId + " (default)"}\n` +
                               `Model: ${llmModel || Environment.defaultLlmModel + " (default)"}`;

        return handlerInput.responseBuilder
            .speak(texts.speechText)
            .reprompt(texts.speechText)
            .withSimpleCard(texts.cardTitle, `${llmInfo}\n${texts.cardContent}`)
            .getResponse();
    }
}