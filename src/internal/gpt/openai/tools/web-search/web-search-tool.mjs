import Environment from "../../../../../environment.mjs";
import {Logger} from "../../../../logger.mjs";
import {GooglePse} from "./google-pse.mjs";

const logger = new Logger('WebSearchTool', process.env.LOG_LEVEL_WEB_SEARCH_TOOL);

const GOOGLE_PSE_ID = Environment.googlePseSearchEngineId
const GOOGLE_PSE_API_KEY = Environment.googlePseApiKey

const BLOCKLIST = Environment.customSearchEngineBlocklist || [];

const SEARCH_ENGINES = {
    GOOGLE: {
        id: 'google',
        displayName: 'Google Programmable Search Engine',
        search: GooglePse.search
    }
}

export class WebSearchTool {

    /**
     *
     * @param parameters {{searchEngineId: string, clientId: string, apiKey: string, query: string}}
     * @return {Promise<object>}
     */
    static async execute(parameters) {

        const searchEngine = Object.values(SEARCH_ENGINES).find(engine => engine.id === parameters.searchEngineId) || SEARCH_ENGINES.GOOGLE;

        const clientId = parameters.clientId || GOOGLE_PSE_ID;
        const apiKey = parameters.apiKey || GOOGLE_PSE_API_KEY;
        const query = parameters.query;

        logger.debug(`Searching the web for '${query}' using '${searchEngine.id}' search engine.`);

        return searchEngine.search(clientId, apiKey, query);
    }

    /**
     *
     * @param responseJson {object}
     * @return {[{id: string, title: string, link: string, snippet: string}]}
     */
    static getFilteredResponse(responseJson) {

        const result = [];

        for (let i = 0; i < responseJson.items.length; i++) {
            const item = responseJson.items[i];
            // result.push({id: `search_result_${i}`, title: item.title, link: item.link, snippet: item.snippet});

            if (BLOCKLIST.some(domain => item.link.includes(domain))) {
                continue;
            }

            result.push({id: `search_result_${i}`, title: item.title, link: item.link});
            if (result.length >= 5) {
                break;
            }
        }

        return result;
    }
}