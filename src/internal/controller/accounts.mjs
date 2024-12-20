import {CryptoWrapper} from "../crypto/crypto-wrapper.mjs";
import bcrypt from 'bcryptjs';
import {Logger} from "../logger.mjs";
import {Errors} from "./errors.mjs"
import Environment from "../../environment.mjs";
import crypto from "crypto";

/**
 * LOG_LEVEL: error|debug
 */
const logger = new Logger("App", process.env.LOG_LEVEL_ACCOUNTS_RESOURCE);

export class Accounts {

    /**
     *
     * @param userDataManager {UserDataManager}
     * @param userAccountMappingsManager {UserAccountMappingsManager}
     */
    constructor(userDataManager, userAccountMappingsManager) {
        this.userDataManager = userDataManager;
        this.userAccountMappingsManager = userAccountMappingsManager;
    }

    async accounts_accountId_apiKey_put(lambdaTriggerPayload) {
        logger.debug("Checking input parameters")
        const usernameFromPathParamBase64 = lambdaTriggerPayload?.pathParameters?.username;
        if (!usernameFromPathParamBase64) {
            // return same error as AWS API Gateway for wrong apiKey
            return Errors.FORBIDDEN();
        }

        const authHeaderFull = lambdaTriggerPayload?.headers?.Authorization;
        if (!authHeaderFull) {
            // return same error as AWS API Gateway for wrong apiKey
            return Errors.FORBIDDEN();
        }
        const credentialsBase64 = authHeaderFull.split(" ")[1];
        const credentialsParts = Buffer.from(credentialsBase64, 'base64').toString('utf-8').split(":");
        if (!credentialsParts || credentialsParts.length < 2) {
            // return same error as AWS API Gateway for wrong apiKey
            return Errors.FORBIDDEN();
        }

        const usernameFromPathParam = Buffer.from(usernameFromPathParamBase64, 'base64').toString('utf-8');
        const usernameFromHeader = credentialsParts[0];
        if (usernameFromHeader !== usernameFromPathParam) {
            // return same error as AWS API Gateway for wrong apiKey
            return Errors.FORBIDDEN();
        }

        // password is all remaining parts joined by ':'
        const passwordFromHeader = credentialsParts.slice(1).join(":");

        logger.debug("Retrieving user account mapping")
        const userAccountMapping = await this.userAccountMappingsManager.getAccountMappingByUsername(usernameFromHeader);
        if (!userAccountMapping) {
            // return same error as AWS API Gateway for wrong apiKey
            return Errors.FORBIDDEN();
        }

        // compare hashed password with input password
        logger.debug("Validating access")
        const storedPasswordHash = userAccountMapping.getPasswordHash();
        if (!storedPasswordHash) {
            // return same error as AWS API Gateway for wrong apiKey
            return Errors.FORBIDDEN();
        }
        const passwordCorrect = bcrypt.compareSync(passwordFromHeader, storedPasswordHash);
        if (!passwordCorrect) {
            // return same error as AWS API Gateway for wrong apiKey
            return Errors.FORBIDDEN();
        }

        // decrypt alexaUserId with username + password + salt
        const alexaUserIdEncrypted = userAccountMapping.getAlexaUserIdEncrypted();
        const alexaUserId = CryptoWrapper.decrypt(usernameFromHeader + passwordFromHeader + Environment.encryptedUserIdSalt, alexaUserIdEncrypted);
        logger.debug("Access granted");

        // now we can access the corresponding user in the userdata table
        logger.debug("Store encrypted api key in user data")
        const payloadObj = this.parseBodyPayload(lambdaTriggerPayload.body);
        if ( !payloadObj ) {
            return Errors.BAD_REQUEST();
        }

        const apiKey = payloadObj.apiKey;
        const model =  payloadObj.model;
        if ( !model || model.length === 0 ) {
            return Errors.BAD_REQUEST();
        }

        const result = await this.userDataManager.updateUserSettings(alexaUserId, apiKey, "OpenAI", model);

        if (logger.checkLogLevel(Logger.LEVEL_DEBUG)) {
            logger.debug("Result: " + JSON.stringify(result));
        }
        const resultCode = result?.$metadata?.httpStatusCode;
        return {
            statusCode: (!resultCode)
                ? 500
                : resultCode === 200
                    ? 204
                    : resultCode
        }
    }

    /**
     * Parses the body payload into an object.
     * Returns undefined if no payload is found.
     *
     * @param httpBody
     * @return {undefined|*}
     */
    parseBodyPayload(httpBody) {
        if (!httpBody) {
            return;
        }

        try {
            return JSON.parse(httpBody);
        } catch (error) {
            logger.error("Error while parsing JSON body: " + error);
        }
    }

}