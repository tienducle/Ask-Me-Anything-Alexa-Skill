import Alexa from "ask-sdk-core";
import LocaleService from "../internal/locale-service.mjs";
import {Logger} from "../internal/logger.mjs";
import {OpenAiService} from "../gpt/open-ai-service.mjs";
import {UserDataManager} from "../internal/persistence/user-data-manager.mjs";

const logger = new Logger('AskQuestionIntentHandler', process.env.LOG_LEVEL_ASK_QUESTION_INTENT_HANDLER);

const SERVICE = process.env.GPT_SERVICE || 'OpenAI';
const SERVICE_INSTANCE = {};

export class AskQuestionIntentHandler {

    /**
     *
     * @param userDataManager {UserDataManager}
     */
    constructor(userDataManager) {
        this.userDataManager = userDataManager;
    }

    initializeService() {
        logger.debug(`Initializing service ${SERVICE}`);
        if (SERVICE === 'OpenAI') {
            return new OpenAiService();
        } else {
            return new OpenAiService();
        }
    }

    /**
     *
     * @param handlerInput
     * @return {boolean}
     */
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskQuestionIntent';
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

        if (!SERVICE_INSTANCE.SERVICE) {
            SERVICE_INSTANCE.SERVICE = this.initializeService();
        }

        const alexaUserId = Alexa.getUserId(handlerInput.requestEnvelope)
        const locale = handlerInput.requestEnvelope._internal.locale;

        const userApiKey = await this.userDataManager.getApiKey(alexaUserId);
        if ( !userApiKey )
        {
            // check user quota
            if (await this.userDataManager.checkUserQuotaExceeded(alexaUserId))
            {
                const quotaExceededTexts = LocaleService.getLocalizedTexts(locale, "handler.askQuestion.quotaReached");
                return handlerInput.responseBuilder
                    .speak(quotaExceededTexts.speechText)
                    .withSimpleCard(quotaExceededTexts.cardTitle, quotaExceededTexts.cardContent)
                    .getResponse();
            }
        }

        const query = handlerInput.requestEnvelope.request.intent.slots.query?.value || handlerInput.requestEnvelope.request.intent.slots.fullQuery?.value;
        const answer = await SERVICE_INSTANCE.SERVICE.getAnswer(
            userApiKey,
            await this.userDataManager.getMessageHistory(alexaUserId),
            query, locale
        );

        await this.userDataManager.addMessagePairToHistory(alexaUserId, query, answer);
        await this.userDataManager.incrementUsageCount(alexaUserId, userApiKey);

        const answerPrefixTexts = LocaleService.getLocalizedTexts(locale, "handler.askQuestion.answerPrefixText");
        const repromptTexts = LocaleService.getLocalizedTexts(locale, "handler.askQuestion.repromptText");

        logger.debug(`Responding with ${JSON.stringify(answer)}`);

        return handlerInput.responseBuilder
            .speak(answerPrefixTexts.speechText + answer)
            .withSimpleCard(query, answerPrefixTexts.cardContent + answer)
            .reprompt(repromptTexts.speechText, 'ENQUEUE')
            .withShouldEndSession(false)
            .getResponse();
    }


}