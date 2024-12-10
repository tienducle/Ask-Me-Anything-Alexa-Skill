import {OpenAiService} from "./openai/open-ai-service.mjs";
import {AnthropicService} from "./anthropic/anthropic-service.mjs";

export class LlmServices {

    static OPEN_AI = {
        id: OpenAiService.ID,
        models: OpenAiService.MODELS,
        instance: new OpenAiService(),
        invoke: async function (scopedUserDataManager, query, locale) {
            return await this.instance.getAnswer(scopedUserDataManager, query, locale);
        }
    }

    static ANTHROPIC = {
        id: AnthropicService.ID,
        models: AnthropicService.MODELS,
        instance: new AnthropicService(),
        invoke: async function (scopedUserDataManager, query, locale) {
            return await this.instance.getAnswer(scopedUserDataManager, query, locale);
        }
    }

    static all() {
        return [
            LlmServices.OPEN_AI,
            LlmServices.ANTHROPIC
        ];
    }

    static getServiceById(id) {
        return LlmServices.all().find(service => service.id === id);
    }

    static getServiceByModel(model) {
        return LlmServices.all().find(service => Object.keys(service.models).includes(model));
    }
}