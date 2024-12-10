import {Logger} from "../../../../logger.mjs";

const API_HOSTNAME = 'www.googleapis.com';
const API_VERSION = 'v1';
const API_BASE_PATH_CUSTOM_SEARCH = '/customsearch';

const logger = new Logger('GooglePse', process.env.LOG_LEVEL_GOOGLE_PSE);

export class GooglePse {

    /**
     *
     * @param searchEngineId {string}
     * @param searchEngineApiKey {string}
     * @param query {string}
     * @return {Promise<object>}
     */
    static async search( searchEngineId, searchEngineApiKey, query ) {

        const url = `https://${API_HOSTNAME}${API_BASE_PATH_CUSTOM_SEARCH}/${API_VERSION}?`
            + `key=${searchEngineApiKey}&cx=${searchEngineId}&q=${query}`;

        const options = {
            method: 'GET',
            headers: {
                'Accept-Encoding': 'gzip, deflate',
                'Content-Type': 'application/json'
            }
        };

        const response = await fetch(url, options);

        if (!response.ok) {
            logger.error(`Failed to search the web for ${query}.`);
            return {
                error: "Failed to search the web."
            }
        }

        return await response.json();
        // return "Regnerisch bei 20°C";
    }

}