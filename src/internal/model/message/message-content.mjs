export class MessageContent {

    /**
     * @param type {Content}
     */
    constructor( type ) {
        this.type = type;
    }

    /**
     * @return {Content}
     */
    getType() {
        return this.type;
    }
}