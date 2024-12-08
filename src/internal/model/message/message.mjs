import {MessageContent} from "./message-content.mjs";
import {TextContent} from "./content/text-content.mjs";
import Content from "./content/content.mjs";
import {FunctionCallRequestContent} from "./content/function-call-request-content.mjs";
import {FunctionCallResultContent} from "./content/function-call-result-content.mjs";

export class Message {

    /**
     *
     * @param role {string}
     * @param content {string|[object]|[MessageContent]}
     */
    constructor(role, content) {
        this.role = role;

        this.content = [];
        if (typeof content === "string") {
            // shortcut for text content
            this.content.push(new TextContent(content));
        } else {
            content.forEach((contentElement) => {
                if (typeof contentElement !== "object") {
                    // element is class instance
                    this.content.push(contentElement);
                } else {
                    // element is just an object (when deserialized from DB)
                    switch (contentElement.type) {
                        case Content.TEXT:
                            this.content.push(new TextContent(contentElement.text));
                            break;
                        case Content.FUNCTION_CALL_REQUEST:
                            this.content.push(new FunctionCallRequestContent(contentElement.id, contentElement.functionType, contentElement.functionName, contentElement.functionArguments));
                            break;
                        case Content.FUNCTION_CALL_RESULT:
                            this.content.push(new FunctionCallResultContent(contentElement.id, contentElement.content));
                            break;
                        default:
                    }
                }
            });
        }
    }

    /**
     * @return {string}
     */
    getRole() {
        return this.role;
    }

    /**
     * @return {[string]}
     */
    getContent() {
        return this.content;
    }

}