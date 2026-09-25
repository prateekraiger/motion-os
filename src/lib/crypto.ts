/**
 * End-to-end encryption for the bring-your-own-cloud payload.
 *
 * The passphrase never leaves the device: it is stretched with PBKDF2 into an
 * AES-GCM key, and the JSON state is sealed before it is handed to WebDAV (or
 * copied into an encrypted backup file). Without the passphrase a stolen
 * payload is opaque bytes — which is the whole point of BYOC.
 */
import { base64ToBytes, bytesToBase64, bytesToUtf8, concatBytes, utf8ToBytes } from "./encoding";

export const KDF_ITERATIONS = 210_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export interface EncryptedEnvelope {
  v: 1;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ct: string;
}

const subtle = () => {
  const c = globalThis.crypto;
  if (!c?.subtle) throw new Error("WebCrypto unavailable");
  return c.subtle;
};

export function cryptoAvailable(): boolean {
  return typeof globalThis.crypto?.subtle !== "undefined";
}

/** Stretch a passphrase + salt into an AES-GCM key. */
export async function deriveKey(passphrase: string, salt: Uint8Array, iterations = KDF_ITERATIONS): Promise<CryptoKey> {
  const material = await subtle().importKey("raw", utf8ToBytes(passphrase) as BufferSource, "PBKDF2", false, [
    "deriveKey",
  ]);
  return subtle().deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

/** Seal a UTF-8 string into a self-describing envelope. */
export async function encryptString(plaintext: string, passphrase: string): Promise<EncryptedEnvelope> {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const key = await deriveKey(passphrase, salt);
  const ct = await subtle().encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    utf8ToBytes(plaintext) as BufferSource,
  );
  return {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iterations: KDF_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ct)),
  };
}

export function isEnvelope(value: unknown): value is EncryptedEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.v === 1 && v.kdf === "PBKDF2-SHA256" && typeof v.salt === "string" && typeof v.ct === "string";
}

/** Open an envelope produced by `encryptString`. Throws on a wrong passphrase. */
export async function decryptEnvelope(envelope: EncryptedEnvelope, passphrase: string): Promise<string> {
  const salt = base64ToBytes(envelope.salt);
  const iv = base64ToBytes(envelope.iv);
  const key = await deriveKey(passphrase, salt, envelope.iterations || KDF_ITERATIONS);
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    base64ToBytes(envelope.ct) as BufferSource,
  );
  return bytesToUtf8(new Uint8Array(plain));
}

/** Raw bytes helper used by the native file-sync path. */
export function envelopeToBytes(envelope: EncryptedEnvelope): Uint8Array {
  return utf8ToBytes(JSON.stringify(envelope));
}

export { concatBytes };
