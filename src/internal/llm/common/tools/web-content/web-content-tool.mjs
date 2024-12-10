import {Logger} from "../../../../logger.mjs";
import chardet from "chardet";
import iconv from "iconv-lite";
import {JSDOM} from "jsdom";

const logger = new Logger('WebContentTool', process.env.LOG_LEVEL_WEB_CONTENT_TOOL);

export class WebContentTool {

    /**
     *
     * @param parameters {{url: string}}
     * @return {Promise<object>}
     */
    static async execute(parameters) {

        const url = parameters.url;
        logger.debug(`Retrieving web page content from ${url}.`);

        const response = await fetch(url);
        if (!response.ok) {
            return {
                error: "Unable to retrieve web page content."
            };
        }

        return await response.arrayBuffer();
    }

    /**
     *
     * @param responseContent {ArrayBuffer}
     * @return {string}
     */
    static getFilteredResponse(responseContent) {
        const encoding = chardet.detect(Buffer.from(responseContent));
        const decodedText = iconv.decode(Buffer.from(responseContent), encoding);

        const result = this.extractVisibleText(decodedText);
        logger.debug(`Filtered content: ${result}`);
        return result;
    }

    static extractVisibleText(html) {
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Remove all script and style elements
        const scriptsAndStyles = document.querySelectorAll('script, style');
        scriptsAndStyles.forEach(el => el.remove());

        // Extract visible text from the remaining elements
        const bodyText = document.body.textContent || '';

        return bodyText.replace(/\s+/g, ' ').trim();
    }
}