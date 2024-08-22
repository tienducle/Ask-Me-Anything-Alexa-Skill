import {WebSearchTool} from "./web-search/web-search-tool.mjs";
import {WebContentTool} from "./web-content/web-content-tool.mjs";

export class Tools {

    static CurrentDateTimeTool = {
        api: {
            type: "function",
            function: {
                name: "get_current_date_time",
                strict: true,
                description: "Get the current date and time. Call this whenever you need to get the current date and time.",
                parameters: {
                    type: "object",
                    properties: {},
                    required: [],
                    additionalProperties: false,
                },
            }
        },
        internal: {
            execute: async () => {
                return new Date().toISOString();
            },
            getFilteredResponse: (response) => {
                return response;
            }
        }
    }

    static WebSearchTool = {
        api: {
            type: "function",
            function: {
                name: "web_search",
                strict: true,
                description: `Search the web for information. Call this whenever you need to search the web for information, for example when a user asks 'How is the weather today in London', then rephrase the query to optimize it for a web search and call the function with the query. Then, use the links provided in the search result to retrieve the content of a web page with the get_webpage_content tool. Do not just respond with the URLs to the user. Do not allow the user to ask for illegal things.`,
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "The search query for the web search.",
                        },
                    },
                    required: ["query"],
                    additionalProperties: false,
                },
            }
        },
        internal: {
            execute: async (parameters) => {
                return await WebSearchTool.execute(parameters);
            },
            getFilteredResponse: (response) => {
                return WebSearchTool.getFilteredResponse(response);
            }
        }
    }

    static WebContentTool = {
        api: {
            type: 'function',
            function: {
                name: 'get_webpage_content',
                strict: true,
                description: 'Retrieve the content of a web page. Use this whenever you need to get the HTML content of a specific web page URL.',
                parameters: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'string',
                            description: 'The URL of the web page to retrieve.',
                        },
                    },
                    required: ['url'],
                    additionalProperties: false,
                },
            },
        },
        internal: {
            execute: async (parameters) => {
                return await WebContentTool.execute(parameters);
            },
            getFilteredResponse: (response) => {
                return WebContentTool.getFilteredResponse(response);
            }
        }
    }

}