import {LlmMessage} from "../../common/llm-message.mjs";

export class OpenAiMessage extends LlmMessage {

    /**
     *
     * @param role {string}
     * @param content {[object]}
     * @param functionCalls {object}
     * @param functionCallId {string}
     * @param refusal {object}
     */
    constructor(role, content, functionCalls, functionCallId, refusal) {
        super(role, content);
        this.tool_calls = functionCalls || undefined;
        this.tool_call_id = functionCallId || undefined;
        this.refusal = refusal || undefined;
    }

    setContent(content) {
        this.content = content;
    }

    /**
     * @param content {object}
     */
    addContent(content) {
        this.content.push(content);
    }

    addToolCall(functionCall) {
        if (!this.tool_calls) {
            this.tool_calls = [];
        }
        this.tool_calls.push(functionCall);
    }

    setToolCallId(functionCallId) {
        this.tool_call_id = functionCallId;
    }
}