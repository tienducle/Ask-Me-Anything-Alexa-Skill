import {LlmMessage} from "../../common/llm-message.mjs";

export class AnthropicMessage extends LlmMessage {

    /**
     *
     * @param role {string}
     * @param content {[object]}
     */
    constructor(role, content) {
        super(role, content);
    }

}