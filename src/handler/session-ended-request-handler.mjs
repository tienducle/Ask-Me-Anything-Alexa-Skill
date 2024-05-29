import Alexa from "ask-sdk-core";
import {Logger} from "../internal/logger.mjs";

const logger = new Logger('SessionEndedRequestHandler', process.env.LOG_LEVEL_SESSION_ENDED_REQUEST_HANDLER);

export class SessionEndedRequestHandler {

    constructor( userDataManager ) {
        this.userDataManager = userDataManager;
    }

    /**
     *
     * @param handlerInput
     * @return {boolean}
     */
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    }

    /**
     *
     * @param handlerInput
     * @return {Response}
     */
    async handle(handlerInput) {
        // Any clean-up logic goes here.
        logger.debug("Persisting user data before ending session");
        const userId = Alexa.getUserId(handlerInput.requestEnvelope);
        await this.userDataManager.endSession(userId);

        return handlerInput.responseBuilder.getResponse();
    }
}