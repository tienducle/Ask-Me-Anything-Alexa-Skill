import {assert} from "chai";
import {expect} from "chai";
import {GooglePse} from "../../../../../../../src/internal/gpt/openai/tools/web-search/google-pse.mjs";
import Environment from "../../../../../../../src/environment.mjs";
import { JSDOM } from 'jsdom';
import iconv from 'iconv-lite';
import chardet from 'chardet';

describe("GooglePse tests", () => {

    it("verify GooglePse.search returns search results", async () => {

        const GOOGLE_PSE_ID = Environment.googlePseSearchEngineId;
        const GOOGLE_PSE_API_KEY = Environment.googlePseApiKey;

        const url = "https://www.kalenderpedia.de/datum-heute.html";
        const response = await fetch(url);
        const responseContent = await response.arrayBuffer();
        const encoding = chardet.detect(Buffer.from(responseContent));
        const decodedText = iconv.decode(Buffer.from(responseContent), encoding);

        const visibleText = extractVisibleText(decodedText.toString());

        // let responseJson = await GooglePse.search(GOOGLE_PSE_ID, GOOGLE_PSE_API_KEY, "Wetter Jena");

        // console.log("responseJson: ", responseJson);

        // responseJson.items[]
    });

    function extractVisibleText(html) {
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Remove all script and style elements
        const scriptsAndStyles = document.querySelectorAll('script, style');
        scriptsAndStyles.forEach(el => el.remove());

        // Extract visible text from the remaining elements
        const bodyText = document.body.textContent || '';

        // Clean up the text
        return bodyText.replace(/\s+/g, ' ').trim();
    }

});