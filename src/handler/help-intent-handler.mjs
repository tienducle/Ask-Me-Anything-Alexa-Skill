import Alexa from "ask-sdk-core";
import LocaleService from "../internal/locale-service.mjs";
import {Logger} from "../internal/logger.mjs";

const logger = new Logger('HelpIntentHandler', process.env.LOG_LEVEL_HELP_INTENT_HANDLER);

export const HelpIntentHandler = {

    /**
     *
     * @param handlerInput
     * @return {boolean}
     */
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },

    /**
     *
     * @param handlerInput
     * @return {Response}
     */
    handle(handlerInput) {
        const locale = handlerInput.requestEnvelope._internal.locale;
        const texts = LocaleService.getLocalizedTexts(locale, "handler.help.text");
        const repromptTexts = LocaleService.getLocalizedTexts(locale, "handler.help.repromptText");

        return handlerInput.responseBuilder
            .speak(texts.speechText)
            .withSimpleCard(texts.cardTitle, texts.cardContent)
            .reprompt(repromptTexts.speechText, 'ENQUEUE')
            .withShouldEndSession(false)
            .getResponse();
    }
}