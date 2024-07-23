import Alexa from "ask-sdk-core";
import LocaleService from "../internal/locale-service.mjs";
import {Logger} from "../internal/logger.mjs";
import {UserDataManager} from "../internal/persistence/user-data-manager.mjs";
import {UserAccountMappingsManager} from "../internal/persistence/user-account-mappings-manager.mjs";

const logger = new Logger('RegistrationIntentHandler', process.env.LOG_LEVEL_REGISTRATION_INTENT_HANDLER);

export class RegistrationIntentHandler {

    /**
     *
     * @param userDataManager {UserDataManager}
     * @param userAccountMappingsManager {UserAccountMappingsManager}
     */
    constructor(userDataManager, userAccountMappingsManager) {
        this.userDataManager = userDataManager;
        this.userAccountMappingsManager = userAccountMappingsManager;
    }

    /**
     *
     * @param handlerInput
     * @return {boolean}
     */
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'RegistrationIntent';
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

        if (!await this.userDataManager.isUserRegistered(alexaUserId)) {
            logger.debug('User is not registered yet. Starting registration flow.');
            let registrationSucceeded = false;
            try {
                registrationSucceeded = await this.userDataManager.registerUserAccountMapping(alexaUserId);
            } catch (error) {
                logger.error(`Error while creating account mapping: ${error}`);
            }

            if (!registrationSucceeded) {
                logger.error('Unable to create account mapping');
                return this.respondWithCouldNotCreateUserAccountMappingError(handlerInput, locale);
            }
        }

        const username = await this.userDataManager.getUsername(alexaUserId);
        const hashedAlexaUserId = this.userDataManager.getHashedAlexaUserId(alexaUserId);
        const userPassword = this.userAccountMappingsManager.generateUserPassword(hashedAlexaUserId)

        const texts = LocaleService.getLocalizedTexts(locale, "handler.registration.successInfo");
        texts.cardContent = this.replaceCredentialsInText(texts.cardContent, username, userPassword)

        logger.debug("Persisting user data before ending session");
        await this.userDataManager.endSession(alexaUserId);

        return this.respond(handlerInput, texts);
    }

    replaceCredentialsInText( text, username, userPassword )
    {
        text = text.replace('{username}', username);
        text = text.replace('{password}', userPassword);
        return text;
    }

    respondWithCouldNotCreateUserAccountMappingError(handlerInput, locale) {
        return this.respond(handlerInput, LocaleService.getLocalizedTexts(handlerInput.requestEnvelope._internal.locale, "handler.launchRequest.error.couldNotCreateUserAccountMapping"));
    }

    respond(handlerInput, texts) {
        logger.debug(`Responding with ${JSON.stringify(texts)}`);

        return handlerInput.responseBuilder
            .speak(texts.speechText)
            .reprompt(texts.speechText)
            .withSimpleCard(texts.cardTitle, texts.cardContent)
            .withShouldEndSession(true)
            .getResponse();
    }
}