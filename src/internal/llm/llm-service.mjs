import Environment from "../../environment.mjs";
import {AnthropicService} from "./anthropic/anthropic-service.mjs";
import {OpenAiService} from "./openai/open-ai-service.mjs";

/*
 * Available services to use for answering questions.
 * Currently only OpenAI is supported.
 */
const SERVICES = {
    OPEN_AI: {
        id: "OpenAI",
        displayName: "OpenAI",
        instance: new OpenAiService(),
        invoke: async function (scopedUserDataManager, query, locale) {
            return await this.instance.getAnswer(scopedUserDataManager, query, locale);
        }
    },
    ANTHROPIC: {
        id: "Anthropic",
        displayName: "Anthropic",
        instance: new AnthropicService(),
        invoke: async function (scopedUserDataManager, query, locale) {
            return await this.instance.getAnswer(scopedUserDataManager, query, locale);
        }
    },
}

export class LlmService {

    constructor() {

    }

    /**
     *
     * @param scopedUserDataManager {ScopedUserDataManager}
     * @param query
     * @param locale
     * @return {Promise<void>}
     */
    async getAnswer( scopedUserDataManager, query, locale ) {

        const llmServiceId = await scopedUserDataManager.getLlmServiceId() || Environment.defaultLlmServiceId;
        const service = Object.values(SERVICES).find(service => service.id === llmServiceId);

        // cleanup
        // const messageHistory = await scopedUserDataManager.getMessageHistory();
        // service.instance.cleanupAbortedSession(messageHistory);
        return service.instance.getAnswer(scopedUserDataManager, query);
    }
}