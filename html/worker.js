// Export a default object containing event handlers
export default {
    // The fetch handler is invoked when this worker receives a HTTP(S) request
    // and should return a Response (optionally wrapped in a Promise)
    async fetch(request, env, ctx) {
        // You'll find it helpful to parse the request.url string into a URL object. Learn more at https://developer.mozilla.org/en-US/docs/Web/API/URL
        const parsedUrl = new URL(request.url);

        // Extract the original request details
        const { method } = request
        console.log(`Original: ${method} request to ${parsedUrl.hostname}${parsedUrl.pathname}`)

        // handle requests to /production/accounts/{accountId}/apiKey
        if ( method === "PUT" && parsedUrl.pathname.startsWith("/production/accounts/") && parsedUrl.pathname.endsWith("/apiKey") ) {
            console.log("Handling updateApiKey request")
            return await this.handleUpdateApiKeyRequest(request, env, parsedUrl);
        }

        // handle registration page index.html
        if ( method === "GET" && parsedUrl.pathname.startsWith("/ama/index") && parsedUrl.pathname.endsWith(".html") ) {
            console.log("Handling registration page request")
            return await this.handlePageRequest(request, env, parsedUrl);
        }

        // handle privacy pages data-privacy-*.html
        if ( method === "GET" && parsedUrl.pathname.startsWith("/ama/data-privacy-") && parsedUrl.pathname.endsWith(".html") ) {
            console.log("Handling data privacy page request")
            return await this.handlePageRequest(request, env, parsedUrl);
        }

        // handle terms-of-use pages data-privacy-*.html
        if ( method === "GET" && parsedUrl.pathname.startsWith("/ama/terms-of-use-") && parsedUrl.pathname.endsWith(".html") ) {
            console.log("Handling terms-of-use page request")
            return await this.handlePageRequest(request, env, parsedUrl);
        }

        return new Response(JSON.stringify({ message: "Forbidden" }), {
            status: 403,
            headers: {
                'Content-Type': 'application/json'
            },
        });
    },

    async handlePageRequest(originalRequest, env, parsedUrl) {

        const { method, headers } = originalRequest

        // Replace the host with the new target host
        parsedUrl.hostname = env.AWS_S3_BUCKET_WEBSITE_HOSTNAME

        // cut off the /ama part of the path
        parsedUrl.pathname = parsedUrl.pathname.substring(4)

        console.log(`Proxying to ${parsedUrl.toString()}`)

        // Create a new request object
        const modifiedRequest = new Request(parsedUrl.toString(), {
            method,
            headers: new Headers(headers)
        })

        return await fetch(modifiedRequest);
    },

    async handleUpdateApiKeyRequest(originalRequest, env, parsedUrl) {

        const { method, headers } = originalRequest

        // Replace the host with the new target host
        parsedUrl.hostname = env.AWS_API_GATEWAY_HOSTNAME
        console.log(`Proxying to ${parsedUrl.toString()}`)

        // Create a new request object
        const modifiedRequest = new Request(parsedUrl.toString(), {
            method,
            headers: new Headers(headers),
            body: method !== 'GET' && method !== 'HEAD' ? await originalRequest.clone().text() : null,
            redirect: 'follow'
        })

        // Add the new header
        const apiKey = env.AWS_API_GATEWAY_API_KEY;
        console.log(`Adding API Key: ${apiKey.substring(1,4)}`)
        modifiedRequest.headers.set('x-api-key', apiKey)

        // Fetch the response from the new target
        return await fetch(modifiedRequest);
    }
};

