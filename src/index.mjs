import {App} from "./app.mjs";
const app = new App();

export const handler = async ( lambdaTriggerPayload, context ) => {
    return app.handle( lambdaTriggerPayload, context );
};