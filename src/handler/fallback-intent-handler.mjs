import Alexa from "ask-sdk-core";
import LocaleService from "../internal/locale-service.mjs";
import {Logger} from "../internal/logger.mjs";

const logger = new Logger('FallbackIntentHandler', process.env.LOG_LEVEL_FALLBACK_INTENT_HANDLER);

export const FallbackIntentHandler = {

    /**
     *
     * @param handlerInput
     * @return {boolean}
     */
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },

    /**
     *
     * @param handlerInput
     * @return {Response}
     */
    handle(handlerInput) {
        const speechText = 'You can ask me the weather!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withSimpleCard('You can ask me the weather!', speechText)
            .getResponse();
    }
}