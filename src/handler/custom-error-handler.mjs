import Alexa from "ask-sdk-core";
import LocaleService from "../internal/locale-service.mjs";
import {Logger} from "../internal/logger.mjs";

const logger = new Logger('CancelStopIntentHandler', process.env.LOG_LEVEL_CANCEL_STOP_INTENT_HANDLER);

export const CustomErrorHandler = {

    /**
     *
     * @param handlerInput
     * @param error
     * @return {boolean}
     */
    canHandle(handlerInput, error) {
        logger.error(`Error handler triggered: ${error.stack}`);
        return true;
    },

    /**
     * SDK-required function to handle the request.
     *
     * @param handlerInput
     * @param error
     * @return {Response}
     */
    handle(handlerInput, error) {
        if (logger.checkLogLevel(Logger.LEVEL_DEBUG)) {
            logger.debug(`Handler input: ${JSON.stringify(handlerInput)}`);
            logger.debug(`Error: ${JSON.stringify(error)}`);
        }

        const locale = handlerInput.requestEnvelope._internal.locale;
        const texts = LocaleService.getLocalizedTexts(locale, 'handler.error.text');
        logger.debug(`Responding with ${texts}`);

        return handlerInput.responseBuilder
            .speak(texts.speechText)
            .reprompt(texts.speechText)
            .getResponse();
    }
}