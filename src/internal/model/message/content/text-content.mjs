import Content from "./content.mjs";
import {MessageContent} from "../message-content.mjs";

export class TextContent extends MessageContent {

    constructor( text ) {
        super( Content.TEXT );
        this.text = text;
    }

    getText() {
        return this.text;
    }
}