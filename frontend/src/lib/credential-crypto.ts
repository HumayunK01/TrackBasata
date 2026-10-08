import type { Tables } from "@/integrations/supabase/types";

type Credential = Tables<"credentials">;

// ponytail: AES-256-GCM authenticated encryption using native Web Crypto API.
// Passwords are encrypted client-side so database dumps or raw table reads
// never reveal plaintext credentials.
const DEFAULT_SECRET = "basata-ar-credential-vault-secret-v1";
const PREFIX = "enc:v1:";

function getVaultSecret(): string {
  const envSecret =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_VAULT_ENCRYPTION_KEY) ||
    (typeof process !== "undefined" && process.env?.VITE_VAULT_ENCRYPTION_KEY);
  return (envSecret && typeof envSecret === "string" && envSecret.trim()) || DEFAULT_SECRET;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

let cachedKeyPromise: Promise<CryptoKey> | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (!cachedKeyPromise) {
    cachedKeyPromise = (async () => {
      const secret = getVaultSecret();
      const encoder = new TextEncoder();
      const secretHash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
      return crypto.subtle.importKey(
        "raw",
        secretHash,
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
      );
    })();
  }
  return cachedKeyPromise;
}

/**
 * Encrypts a plaintext password with AES-256-GCM.
 * Output format: enc:v1:<base64(12-byte IV + ciphertext + 16-byte auth tag)>
 */
export async function encryptPassword(plainText: string): Promise<string> {
  if (!plainText) return "";
  // If already encrypted, do not re-encrypt
  if (plainText.startsWith(PREFIX)) return plainText;

  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plainText)
  );
  const cipherBytes = new Uint8Array(cipherBuffer);

  const combined = new Uint8Array(iv.length + cipherBytes.length);
  combined.set(iv, 0);
  combined.set(cipherBytes, iv.length);
  return `${PREFIX}${bytesToBase64(combined)}`;
}

/**
 * Decrypts an encrypted password string.
 * If the string does not have the enc:v1: prefix (legacy plain text),
 * it returns the string unchanged for 100% backward compatibility.
 */
export async function decryptPassword(value: string | null | undefined): Promise<string> {
  if (!value) return "";
  if (!value.startsWith(PREFIX)) {
    return value;
  }

  try {
    const rawBase64 = value.slice(PREFIX.length);
    const combined = base64ToBytes(rawBase64);
    if (combined.length <= 12) return value;

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await getCryptoKey();
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch {
    // In case of tampering, key change, or bad data, fail gracefully without crashing
    return value;
  }
}

export async function decryptCredentialRow(row: Credential): Promise<Credential> {
  if (!row || !row.password) return row;
  const decrypted = await decryptPassword(row.password);
  return {
    ...row,
    password: decrypted,
  };
}

export async function decryptCredentialRows(rows: Credential[]): Promise<Credential[]> {
  if (!rows || rows.length === 0) return [];
  return Promise.all(rows.map(decryptCredentialRow));
}
