import Environment from "../environment.mjs";
import Alexa from "ask-sdk-core";
import LocaleService from "../internal/locale-service.mjs";
import {Logger} from "../internal/logger.mjs";
import {AnthropicService} from "../internal/llm/anthropic/anthropic-service.mjs";
import {OpenAiService} from "../internal/llm/openai/open-ai-service.mjs";
import {UserDataManager} from "../internal/persistence/user-data-manager.mjs";
import {LlmServices} from "../internal/llm/llm-services.mjs";

const logger = new Logger('AskQuestionIntentHandler', process.env.LOG_LEVEL_ASK_QUESTION_INTENT_HANDLER);

export class AskQuestionIntentHandler {

    /**
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
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AskQuestionIntent';
    }

    /**
     * SDK-required function to handle the request.
     *
     * The function forwards the user query to the configured GPT service and returns the answer.
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

        const llmServiceId = await this.userDataManager.getLlmServiceId(alexaUserId) || Environment.defaultLlmServiceId;
        const service = LlmServices.getServiceById(llmServiceId);
        const query = handlerInput.requestEnvelope.request.intent.slots.query?.value || handlerInput.requestEnvelope.request.intent.slots.fullQuery?.value;

        // const llmService = new LlmService();
        // const answer = await service.getAnswer(this.userDataManager.getScopedUserDataManager(alexaUserId), query, locale);

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