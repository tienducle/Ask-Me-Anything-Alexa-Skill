export class OpenAiTool {

    /**
     *
     * @param type {string}
     * @param strict {boolean}
     * @param name {string}
     * @param description {string}
     * @param parameters {object}
     */
    constructor( type, strict, name, description, parameters ) {
        this.type = type;
        this.function = {
            name: name,
            strict: strict,
            description: description,
            parameters: parameters,
        }
    }

    /**
     * @return {OpenAiTool}
     */
    static fromGenericToolApi(toolApi)
    {
        return new OpenAiTool(
            toolApi.type,
            toolApi.function.strict,
            toolApi.function.name,
            toolApi.function.description,
            toolApi.function.parameters
        );
    }
}