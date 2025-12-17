import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get encryption key from environment variable
 * INTEGRATION_TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("INTEGRATION_TOKEN_ENCRYPTION_KEY environment variable is not set");
  }
  if (key.length !== 64) {
    throw new Error("INTEGRATION_TOKEN_ENCRYPTION_KEY must be a 64-character hex string");
  }
  return Buffer.from(key, "hex");
}

/**
 * Encrypt a refresh token using AES-256-GCM
 * Returns: base64-encoded string containing: [salt][iv][authTag][ciphertext]
 */
export function encryptToken(plaintext: string): string {
  try {
    const key = getEncryptionKey();

    // Generate random IV and salt
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Derive key using PBKDF2
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, "sha256");

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine salt + iv + authTag + ciphertext
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, "hex")
    ]);

    return combined.toString("base64");
  } catch (error) {
    console.error("Token encryption error:", error);
    throw new Error("Failed to encrypt token");
  }
}

/**
 * Decrypt a refresh token
 * Input: base64-encoded string containing: [salt][iv][authTag][ciphertext]
 */
export function decryptToken(encryptedToken: string): string {
  try {
    const key = getEncryptionKey();

    // Decode base64
    const combined = Buffer.from(encryptedToken, "base64");

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

    // Derive key using PBKDF2
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, 32, "sha256");

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(ciphertext.toString("hex"), "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Token decryption error:", error);
    throw new Error("Failed to decrypt token");
  }
}

/**
 * Generate a random encryption key (for setup)
 * Run this once to generate INTEGRATION_TOKEN_ENCRYPTION_KEY value
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
