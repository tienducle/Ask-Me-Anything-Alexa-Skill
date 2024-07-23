import {AmaBackendApp} from "./ama-backend-app.mjs";
const app = new AmaBackendApp();

export const handler = async ( lambdaTriggerPayload, context ) => {
    return app.handle( lambdaTriggerPayload, context );
};