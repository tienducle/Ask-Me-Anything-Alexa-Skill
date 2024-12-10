import {AmaApp} from "../../../src/ama-app.mjs";
import {expect} from "chai";
import {TestIntentHelper} from "../../utils/test-intent-helper.mjs";
import {UserDataManager} from "../../../src/internal/persistence/user-data-manager.mjs";
import {DynamoDbClientWrapper} from "../../../src/internal/client/dynamo-db-client-wrapper.mjs";
import {UserAccountMappingsManager} from "../../../src/internal/persistence/user-account-mappings-manager.mjs";
import {Common} from "../common.mjs";
import {Logger} from "../../../src/internal/logger.mjs";

const logger = new Logger('AskQuestionIntentHandlerTest', process.env.LOG_LEVEL_ASK_QUESTION_INTENT_HANDLER_TEST);

describe("AskQuestionIntentHandler tests", () => {

    before( async function () {
        await Common.setup();
    } );

    it("verify AskQuestionIntentHandler returns GPT response", async () => {
        const app = new AmaApp();
        let trigger = TestIntentHelper.getAskQuestionIntent("Wie viel sind 2+2");

        let response = await app.handle(trigger);
        console.log("Response: " + response.response.outputSpeech.ssml)
        expect(response.response.outputSpeech.ssml).to.not.equal("<speak>Tut mir Leid, ich konnte deine Eingabe nicht verstehen.</speak>");
        expect(response.response.outputSpeech.ssml).to.contain("4");

        trigger = TestIntentHelper.getAskQuestionIntent("Wie viel sind 15+15");

        response = await app.handle(trigger);
        console.log("Response: " + response.response.outputSpeech.ssml)
        expect(response.response.outputSpeech.ssml).to.not.equal("<speak>Tut mir Leid, ich konnte deine Eingabe nicht verstehen.</speak>");
        expect(response.response.outputSpeech.ssml).to.contain("30");

        trigger = TestIntentHelper.getAskQuestionIntent("Wie viel sind 16+16");

        response = await app.handle(trigger);
        console.log("Response: " + response.response.outputSpeech.ssml)
        expect(response.response.outputSpeech.ssml).to.not.equal("<speak>Tut mir Leid, ich konnte deine Eingabe nicht verstehen.</speak>");
        expect(response.response.outputSpeech.ssml).to.contain("32");

        const ddbConfig = {
            region: "eu-west-1",
            endpoint: "http://localhost:4566"
        };
        const dynamoDbClientWrapper = new DynamoDbClientWrapper(ddbConfig);
        let userAccountMappingsManager = new UserAccountMappingsManager(dynamoDbClientWrapper);
        let userDataManager = new UserDataManager(dynamoDbClientWrapper, userAccountMappingsManager);

        let messageHistoryWrapper = await userDataManager.getMessageHistory("amzn1.ask.account.myuserid");
        console.log("Message history: " + JSON.stringify(messageHistoryWrapper));
    });

    it("verify AskQuestionIntentHandler returns date-time-tool response", async () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthName = date.toLocaleString('de', { month: 'long' });
        const day = date.getDate();

        const app = new AmaApp();
        const trigger = TestIntentHelper.getAskQuestionIntent("Welches Datum haben wir heute?");
        const response = await app.handle(trigger);
        const speechResponse = response.response.outputSpeech.ssml;

        expect(speechResponse).to.contain(day);
        expect(speechResponse).to.satisfy((speech) => speech.includes(month) || speech.includes(monthName));
        expect(speechResponse).to.contain(year);
    });

    it("verify AskQuestionIntentHandler returns simple search engine response", async () => {
        const app = new AmaApp();
        const trigger = TestIntentHelper.getAskQuestionIntent("Was sind die Schlagzeilen des Tages? Bitte mit details.");
        const response = await app.handle(trigger);
        const speechResponse = response.response.outputSpeech.ssml;
        logger.info("Response: " + speechResponse);
    });


    it("verify AskQuestionIntentHandler returns search engine response", async () => {
        const app = new AmaApp();
        const trigger = TestIntentHelper.getAskQuestionIntent("search on 3 web pages for todays world news");
        const response = await app.handle(trigger);
        const speechResponse = response.response.outputSpeech.ssml;
        logger.info("Response: " + speechResponse);
    });
});

