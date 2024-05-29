import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {dirname} from 'path';
import {Logger} from './logger.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const logger = new Logger("LocaleService", process.env.LOG_LEVEL_LOCALE_SERVICE);
const DEFAULT_LOCALE = "en";

export class LocaleService {

    constructor() {
        logger.debug("Initializing LocaleService");

        this.localizedMessages = {};

        const localizedResourcesDir = path.join(__dirname, "../resources/localized");
        fs.readdirSync(localizedResourcesDir).forEach(file => {
            const filePath = path.join(localizedResourcesDir, file);
            let locale = file.split('.')[0];
            if ( locale === "default" ) {
                locale = DEFAULT_LOCALE;
            }
            this.localizedMessages[locale] = JSON.parse(fs.readFileSync(filePath));
        });
    }

    /**
     *
     * @param locale
     * @param key
     * @return {{speechText: string, cardContent: string, cardTitle: string}}
     */
    getLocalizedTexts(locale, key) {
        return {
            speechText: this.getLocalizedText(locale, key + ".speechText"),
            cardTitle: this.getLocalizedText(locale, key + ".cardTitle"),
            cardContent: this.getLocalizedText(locale, key + ".cardContent")
        }
    }

    /**
     *
     * @param locale {string}
     * @param key {string}
     * @param prevKey {string}
     * @return {string}
     */
    getLocalizedText(locale, key, prevKey) {
        let message = this.localizedMessages?.[locale]?.[key];

        if ( message === undefined && key.endsWith(".cardContent") ) {
            // fall back to .speechText first
            logger.warn(`'${key}' not found for locale '${locale}'. Falling back to speechText.`);
            return this.getLocalizedText(locale, key.replace(".cardContent", ".speechText"), key);
        }

        if (message === undefined && prevKey !== undefined && locale !== DEFAULT_LOCALE ) {
            // fall back to previous key
            logger.warn(`'${key}' not found for locale '${locale}'. Falling back to previous key in default locale.`);
            return this.getLocalizedText(DEFAULT_LOCALE, prevKey);
        }

        if (message === undefined && DEFAULT_LOCALE !== locale) {
            logger.warn(`'${key}' not found for locale '${locale}'. Falling back to default locale.`);
            return this.getLocalizedText(DEFAULT_LOCALE, key);
        }
        if (message === undefined) {
            logger.warn(`'${key}' not found for locale '${locale}'.`);
            return key;
        }
        return message;
    }
}

export default new LocaleService();