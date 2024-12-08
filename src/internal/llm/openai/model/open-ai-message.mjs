export class OpenAiMessage {

    /**
     *
     * @param role {string}
     * @param content {[OpenAiContent]}
     * @param functionCalls {object}
     * @param functionCallId {string}
     * @param refusal {object}
     */
    constructor(role, content, functionCalls, functionCallId, refusal) {
        this.role = role;
        this.content = content || [];
        this.tool_calls = functionCalls || undefined;
        this.tool_call_id = functionCallId || undefined;
        this.refusal = refusal || undefined;
    }

    setRole(role) {
        this.role = role;
    }

    setContent(content) {
        this.content = content;
    }

    /**
     * @param content {OpenAiContent}
     */
    addContent(content) {
        this.content.push(content);
    }

    setToolCalls(functionCalls) {
        this.tool_calls = functionCalls;
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