import {AmaApp} from "./ama-app.mjs";
const app = new AmaApp();

export const handler = async ( lambdaTriggerPayload, context ) => {
    return app.handle( lambdaTriggerPayload, context );
};