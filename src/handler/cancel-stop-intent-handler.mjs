import Alexa from "ask-sdk-core";
import LocaleService from "../internal/locale-service.mjs";
import {Logger} from "../internal/logger.mjs";

const logger = new Logger('CancelStopIntentHandler', process.env.LOG_LEVEL_CANCEL_STOP_INTENT_HANDLER);

export class CancelStopIntentHandler {

    constructor( userDataManager ) {
        this.userDataManager = userDataManager;
    }

    /**
     *
     * @param handlerInput
     * @return {boolean}
     */
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
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

        logger.debug("Persisting user data before ending session");
        const alexaUserId = Alexa.getUserId(handlerInput.requestEnvelope);
        await this.userDataManager.endSession(alexaUserId);

        const locale = handlerInput.requestEnvelope._internal.locale;
        const texts = LocaleService.getLocalizedTexts(locale, 'handler.cancelStop.text');
        logger.debug(`Responding with ${JSON.stringify(texts)}`);

        return handlerInput.responseBuilder
            .speak(texts.speechText)
            .withSimpleCard(texts.cardTitle, texts.cardContent)
            .withShouldEndSession(true)
            .getResponse();
    }
}