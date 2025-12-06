/**
 * Encryption Utilities for Broker Credentials
 * Handles secure encryption/decryption of sensitive broker auth data
 */

import crypto from "crypto";

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Get encryption key from environment
 * In production, this should come from a Key Management Service (KMS)
 */
function getEncryptionKey(): string {
  const key = process.env.BROKER_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("BROKER_ENCRYPTION_KEY environment variable is not set");
  }
  if (key.length < 32) {
    throw new Error("BROKER_ENCRYPTION_KEY must be at least 32 characters");
  }
  return key;
}

/**
 * Derive encryption key from master key and user-specific salt
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, "sha512");
}

/**
 * Encrypt sensitive data (broker credentials, tokens, etc.)
 *
 * @param data - The data to encrypt (will be JSON stringified)
 * @param userSalt - User-specific salt for additional security
 * @returns Encrypted string in format: salt.iv.tag.ciphertext (all base64)
 */
export function encryptCredentials(
  data: Record<string, unknown>,
  userSalt?: string
): string {
  try {
    const masterKey = getEncryptionKey();

    // Generate or use provided salt
    const salt = userSalt
      ? Buffer.from(userSalt, "base64")
      : crypto.randomBytes(SALT_LENGTH);

    // Derive key from master key and salt
    const key = deriveKey(masterKey, salt);

    // Generate IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt data
    const plaintext = JSON.stringify(data);
    let ciphertext = cipher.update(plaintext, "utf8", "base64");
    ciphertext += cipher.final("base64");

    // Get auth tag
    const tag = cipher.getAuthTag();

    // Return format: salt.iv.tag.ciphertext
    return [
      salt.toString("base64"),
      iv.toString("base64"),
      tag.toString("base64"),
      ciphertext,
    ].join(".");
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt credentials");
  }
}

/**
 * Decrypt sensitive data
 *
 * @param encryptedString - Encrypted string in format: salt.iv.tag.ciphertext
 * @returns Decrypted data object
 */
export function decryptCredentials(
  encryptedString: string
): Record<string, unknown> {
  try {
    const masterKey = getEncryptionKey();

    // Parse encrypted string
    const parts = encryptedString.split(".");
    if (parts.length !== 4) {
      throw new Error("Invalid encrypted data format");
    }

    const [saltB64, ivB64, tagB64, ciphertext] = parts;

    // Convert from base64
    const salt = Buffer.from(saltB64, "base64");
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");

    // Derive key
    const key = deriveKey(masterKey, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt data
    let plaintext = decipher.update(ciphertext, "base64", "utf8");
    plaintext += decipher.final("utf8");

    // Parse JSON
    return JSON.parse(plaintext);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt credentials");
  }
}

/**
 * Mask sensitive values in logs/error messages
 */
export function maskCredential(value: string, visibleChars: number = 4): string {
  if (!value || value.length <= visibleChars) {
    return "***";
  }
  return "***" + value.slice(-visibleChars);
}

/**
 * Redact sensitive fields from objects before logging
 */
export function redactSensitiveFields(
  obj: Record<string, unknown>,
  sensitiveKeys: string[] = ["password", "token", "secret", "key", "auth", "apiKey", "accessToken", "refreshToken"]
): Record<string, unknown> {
  const redacted = { ...obj };

  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      if (typeof redacted[key] === "string") {
        redacted[key] = maskCredential(redacted[key] as string);
      } else {
        redacted[key] = "***";
      }
    } else if (typeof redacted[key] === "object" && redacted[key] !== null) {
      redacted[key] = redactSensitiveFields(
        redacted[key] as Record<string, unknown>,
        sensitiveKeys
      );
    }
  }

  return redacted;
}

/**
 * Generate user-specific salt for encryption
 */
export function generateUserSalt(): string {
  return crypto.randomBytes(SALT_LENGTH).toString("base64");
}
