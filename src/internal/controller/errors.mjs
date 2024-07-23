export const Errors = {

    BAD_REQUEST(errorMessage) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                "message": "Bad Request",
                "details": errorMessage
            })
        }
    },

    UNAUTHORIZED(errorMessage) {
        return {
            statusCode: 401,
            body: JSON.stringify({
                "message": "Unauthorized",
                "details": errorMessage
            })
        }
    },

    FORBIDDEN(errorMessage) {
        return {
            statusCode: 403,
            body: JSON.stringify({
                "message": "Forbidden",
                "details": errorMessage
            })
        }
    },

    NOT_FOUND(errorMessage) {
        return {
            statusCode: 404,
            body: JSON.stringify({
                "message": "Not Found",
                "details": errorMessage
            })
        }
    },

    INTERNAL_SERVER_ERROR(errorMessage) {
        return {
            statusCode: 500,
            body: JSON.stringify({
                "message": "Internal Server Error",
                "details": errorMessage
            })
        }
    }
}