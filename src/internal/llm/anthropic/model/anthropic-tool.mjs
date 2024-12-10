export class AnthropicTool {
    /**
     *
     * @param name {string}
     * @param description {string}
     * @param inputSchema {object}
     */
    constructor( name, description, inputSchema ) {
        this.name = name;
        this.description = description;
        this.input_schema = inputSchema;
    }

    /**
     * @return {AnthropicTool}
     */
    static fromGenericToolApi(toolApi)
    {
        const inputSchema = {
            type: "object",
            required: toolApi.function.parameters.required
        }

        const properties = {};
        for (const [key, value] of Object.entries(toolApi.function.parameters.properties)) {
            properties[key] = {
                type: value.type,
                description: value.description
            }
        }

        return new AnthropicTool(
            toolApi.function.name,
            toolApi.function.description,
            inputSchema
        );
    }
}