import Content from "./content.mjs";
import {MessageContent} from "../message-content.mjs";

export class FunctionCallRequestContent extends MessageContent {

    /**
     * @param id {string}
     * @param functionType {string}
     * @param functionName {string}
     * @param functionArguments {object}
     */
    constructor( id, functionType, functionName, functionArguments ) {
        super( Content.FUNCTION_CALL_REQUEST );

        this.id = id;
        this.functionType = functionType;
        this.functionName = functionName;
        this.functionArguments = functionArguments;
    }

    getId() {
        return this.id;
    }

    getFunctionType() {
        return this.functionType;
    }

    getFunctionName() {
        return this.functionName;
    }

    getFunctionArguments() {
        return this.functionArguments;
    }

}