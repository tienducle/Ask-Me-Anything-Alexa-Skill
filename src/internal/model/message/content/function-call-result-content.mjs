import Content from "./content.mjs";
import {MessageContent} from "../message-content.mjs";

export class FunctionCallResultContent extends MessageContent {

    /**
     * @param id {string}
     * @param content {string}
     */
    constructor( id, content ) {
        super( Content.FUNCTION_CALL_RESULT );

        this.id = id;
        this.content = content;
    }

    getId() {
        return this.id;
    }

    getContent() {
        return this.content;
    }
}