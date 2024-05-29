import crypto from "crypto";

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

export const CryptoWrapper = {

    encrypt(password, text) {
        // Generate a random salt
        const salt = crypto.randomBytes(SALT_LENGTH);

        // Derive a key using PBKDF2
        const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');

        // Generate a random initialization vector (IV)
        const iv = crypto.randomBytes(IV_LENGTH);

        // Create a cipher instance
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        // Encrypt the plaintext
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Get the authentication tag
        const tag = cipher.getAuthTag();

        // Concatenate salt, IV, tag, and encrypted text
        return Buffer.concat([salt, iv, tag, Buffer.from(encrypted, 'hex')]).toString('hex');
    },

    decrypt(password, encryptedData) {
        // Decode the hex string
        const data = Buffer.from(encryptedData, 'hex');

        // Extract salt, IV, tag, and encrypted text
        const salt = data.subarray(0, SALT_LENGTH);
        const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const tag = data.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + 16);
        const encryptedText = data.subarray(SALT_LENGTH + IV_LENGTH + 16);

        // Derive the key using PBKDF2
        const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512');

        // Create a decipher instance
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        // Decrypt the text
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}