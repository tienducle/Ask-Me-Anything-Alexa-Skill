import Alexa from "ask-sdk-core";
import LocaleService from "../internal/locale-service.mjs";
import {Logger} from "../internal/logger.mjs";
import {OpenAiService} from "../internal/gpt/openai/open-ai-service.mjs";
import {UserDataManager} from "../internal/persistence/user-data-manager.mjs";
import Environment from "../environment.mjs";

const logger = new Logger('AskQuestionIntentHandler', process.env.LOG_LEVEL_ASK_QUESTION_INTENT_HANDLER);

const SERVICES = {
    OPEN_AI: {
        id: 'open-ai',
        displayName: "OpenAI",
        instance: new OpenAiService(),
        invoke: async function (scopedUserDataManager, query, locale) {
            return await this.instance.getAnswer(scopedUserDataManager, query, locale);
        }
    }
}

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

        const gptServiceId = await this.userDataManager.getGptServiceId(alexaUserId) || Environment.defaultGptServiceId;
        const service = Object.values(SERVICES).find(service => service.id === gptServiceId);
        const query = handlerInput.requestEnvelope.request.intent.slots.query?.value || handlerInput.requestEnvelope.request.intent.slots.fullQuery?.value;
        const answer = await service.invoke( this.userDataManager.getScopedUserDataManager(alexaUserId), query, locale );

        if (!userApiKey)
        {
            await this.userDataManager.incrementUsageCount(alexaUserId, userApiKey);
        }

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