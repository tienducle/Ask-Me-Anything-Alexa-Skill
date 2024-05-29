import {assert} from "chai";
import {expect} from "chai";
import LocaleService from "../../../src/internal/locale-service.mjs";

describe("LocaleService tests", () => {

    it('verify LocaleService.getLocalizedText("en", "test") returns correct text', async () => {
        expect(LocaleService.getLocalizedText("en", "test")).to.equal("Test text from default.json");
    });

    it('verify LocaleService.getLocalizedText("de", "test") returns correct text', async () => {
        expect(LocaleService.getLocalizedText("de", "test")).to.equal("Test text from de.json");
    });

    it('verify LocaleService.getLocalizedText("nonexisting", "test") returns correct text from fallback locale "en"', async () => {
        expect(LocaleService.getLocalizedText("nonexisting", "test")).to.equal("Test text from default.json");
    });

    it('verify LocaleService.getLocalizedText("en", "nonexisting") returns input key', async () => {
        expect(LocaleService.getLocalizedText("en", "nonexisting")).to.equal("nonexisting");
    });

    it('verify LocaleService.getLocalizedText("en", "handler.askQuestion.answerPrefixText.cardContent") returns empty string', async () => {
        expect(LocaleService.getLocalizedText("en", "handler.askQuestion.answerPrefixText.cardContent")).to.equal("");
    });

    it('verify LocaleService.getLocalizedText("en", "handler.launchRequest.error.couldNotCreateUserAccount.cardContent") falls back to .speechText', async () => {
        expect(LocaleService.getLocalizedTexts("en", "handler.launchRequest.error.couldNotCreateUserAccount").cardContent).to.equal("User account data could not be created. This is required to store up to 3 messages for your GPT context.");
    });

    it('verify LocaleService.getLocalizedText("nonexisting", "handler.launchRequest.error.nonexisting.cardContent") falls back to .speechText', async () => {
        expect(LocaleService.getLocalizedTexts("nonexisting", "handler.launchRequest.error.nonexisting").cardContent).to.equal("handler.launchRequest.error.nonexisting.speechText");
    });

});

