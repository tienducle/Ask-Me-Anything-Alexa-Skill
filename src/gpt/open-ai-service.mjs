import Environment from "../environment.mjs";
import LocaleService from "../internal/locale-service.mjs";
import {Logger} from "../internal/logger.mjs";

const logger = new Logger('OpenAiService', process.env.LOG_LEVEL_OPEN_AI_SERVICE);
const API_KEY = Environment.gptOpenAiApiKey
const MODEL = Environment.gptOpenAiModel

const API_HOSTNAME = 'api.openai.com';
const API_VERSION = 'v1';

const API_BASE_PATH_CHAT_COMPLETIONS = '/chat/completions';

export class OpenAiService {

    constructor() {

    }

    /**
     *
     * @param apiKey {string}
     * @param locale {string}
     * @param query {string}
     * @param messageHistory {[{assistant: string, user: string}]}
     * @return {Promise<string>}
     */
    getAnswer(apiKey, messageHistory, query, locale) {
        const url = `https://${API_HOSTNAME}/${API_VERSION}${API_BASE_PATH_CHAT_COMPLETIONS}`
        const queryPrefix = LocaleService.getLocalizedText(locale, "gpt.prefix");
        if ( !apiKey )
        {
            logger.warn(`Using default OpenAI API key`);
        }
        const effectiveApiKey = apiKey || API_KEY;

        return new Promise((resolve, reject) => {
            const headers = {
                'Content-Type': 'application/json', 'Authorization': `Bearer ${effectiveApiKey}`
            };

            const messages = [{
                "content": "You are a helpful assistant.\nThe user will ask you questions and you will provide answers in the same language that the user uses.\nBe precise and informative.\nYour answers shouldn't be too long unless the user asks for more details.\nYour answer text will be read by Alexa and shown to the user on an Amazon Echo Show device.",
                "role": "system"
            }]

            messageHistory.forEach((message) => {
                messages.push({
                    "content": message.assistant, "role": "assistant"
                });
                messages.push({
                    "content": message.user, "role": "user"
                });
            });

            messages.push({
                "content": queryPrefix + query, "role": "user"
            });

            const body = {
                messages: messages, "temperature": 0.5, "model": MODEL, "n": 1, "max_tokens": 4000
            };
            const options = {
                method: 'POST', headers: headers, body: JSON.stringify(body)
            };

            return fetch(url, options)
                .then(response => response.json())
                .then(data => {
                    if (data.error?.message) {
                        return resolve(data.error.message);
                    }
                    return resolve(data.choices[0].message.content);
                })
                .catch(error => {
                    logger.error(`Failed to get answer from OpenAI: ${error}`);
                    resolve(error);
                });

        });
    }
}