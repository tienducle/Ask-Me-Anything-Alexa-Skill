export class Message {

    /**
     *
     * @param role {string}
     * @param content {string}
     * @param tool_calls {object}
     * @param tool_call_id {string}
     * @param refusal {object}
     */
    constructor(role, content, tool_calls, tool_call_id, refusal) {
        this.role = role;
        this.content = content;

        // todo: this gets very tailored to OpenAI API, might need refactoring
        this.tool_calls = tool_calls || undefined;
        this.tool_call_id = tool_call_id || undefined;
        this.refusal = refusal || undefined;
    }

    getRole() {
        return this.role;
    }

    getContent() {
        return this.content;
    }

    addProperty(key, value) {
        this[key] = value;
    }
}