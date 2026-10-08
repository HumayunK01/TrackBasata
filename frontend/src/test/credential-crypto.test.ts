import { describe, it, expect } from "vitest";
import {
  encryptPassword,
  decryptPassword,
  decryptCredentialRows,
} from "@/lib/credential-crypto";
import type { Credential } from "@/hooks/useCredentials";

describe("credential-crypto", () => {
  it("encrypts plaintext passwords into enc:v1: prefixed ciphertext", async () => {
    const raw = "SuperSecretPortalPass#2026";
    const encrypted = await encryptPassword(raw);

    expect(encrypted).toMatch(/^enc:v1:[A-Za-z0-9+/=]+$/);
    expect(encrypted).not.toContain(raw);
  });

  it("produces distinct ciphertexts for the same plaintext due to random IV", async () => {
    const raw = "IdenticalPassword99";
    const enc1 = await encryptPassword(raw);
    const enc2 = await encryptPassword(raw);

    expect(enc1).not.toBe(enc2);
  });

  it("decrypts ciphertext back to the original plaintext", async () => {
    const raw = "NextGen_Athena_Login_Key!@#$";
    const encrypted = await encryptPassword(raw);
    const decrypted = await decryptPassword(encrypted);

    expect(decrypted).toBe(raw);
  });

  it("preserves legacy unencrypted passwords without alteration (backward compatibility)", async () => {
    const legacyPlain = "UnencryptedLegacyPassword123";
    const result = await decryptPassword(legacyPlain);

    expect(result).toBe(legacyPlain);
  });

  it("handles null, undefined, or empty values cleanly", async () => {
    expect(await encryptPassword("")).toBe("");
    expect(await decryptPassword("")).toBe("");
    expect(await decryptPassword(null)).toBe("");
    expect(await decryptPassword(undefined)).toBe("");
  });

  it("does not double-encrypt an already encrypted string", async () => {
    const raw = "MyPassword123";
    const encrypted = await encryptPassword(raw);
    const doubleEncrypted = await encryptPassword(encrypted);

    expect(doubleEncrypted).toBe(encrypted);
  });

  it("gracefully recovers from corrupted or truncated ciphertext without throwing", async () => {
    const corrupted = "enc:v1:bm90LWEtdmFsaWQtYWVzLWNpcGhlcg==";
    const result = await decryptPassword(corrupted);

    expect(result).toBe(corrupted);
  });

  it("decrypts mixed batches of encrypted and legacy rows correctly", async () => {
    const mockEncryptedPassword = await encryptPassword("EncryptedSecretPass");

    const rows = [
      {
        id: "1",
        folder_id: "f1",
        service: "AthenaHealth",
        login_id: "user1",
        password: mockEncryptedPassword,
        notes: null,
        website: null,
        created_by: "u1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
      {
        id: "2",
        folder_id: "f1",
        service: "NextGen",
        login_id: "user2",
        password: "LegacyPlainTextPass",
        notes: null,
        website: null,
        created_by: "u1",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    ] as Credential[];

    const decrypted = await decryptCredentialRows(rows);

    expect(decrypted[0].password).toBe("EncryptedSecretPass");
    expect(decrypted[1].password).toBe("LegacyPlainTextPass");
  });
});
