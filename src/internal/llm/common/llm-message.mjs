export class LlmMessage {

    /**
     *
     * @param role {string}
     * @param content {[object]}
     */
    constructor(role, content) {
        this.role = role;
        this.content = content || [];
    }

    /**
     * @param content {object}
     */
    addContent(content) {
        this.content.push(content);
    }

}