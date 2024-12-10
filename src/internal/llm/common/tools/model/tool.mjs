export class Tool {

    constructor( type, strict, name, description, parameters ) {
        this.type = type;
        this.function = {
            name: name,
            strict: strict,
            description: description,
            parameters: parameters,
        }
    }

}