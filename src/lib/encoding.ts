/* Binary/text helpers shared by the crypto, sync and backup layers. */

export function utf8ToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Concatenate byte arrays without copying more than needed. */
export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

const gzipSupported = () =>
  typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";

/**
 * gzip a UTF-8 string, returned as base64. Falls back to plain base64 when the
 * runtime has no CompressionStream (very old WebViews).
 */
export async function compressToBase64(text: string): Promise<string> {
  const bytes = utf8ToBytes(text);
  if (!gzipSupported()) return bytesToBase64(bytes);
  try {
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream("gzip"));
    const buffer = await new Response(stream).arrayBuffer();
    return bytesToBase64(new Uint8Array(buffer));
  } catch {
    return bytesToBase64(bytes);
  }
}

/** Inverse of `compressToBase64`; transparently handles uncompressed input. */
export async function decompressBase64ToText(base64: string): Promise<string> {
  const bytes = base64ToBytes(base64);
  if (!gzipSupported()) return bytesToUtf8(bytes);
  try {
    const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
    const buffer = await new Response(stream).arrayBuffer();
    return bytesToUtf8(new Uint8Array(buffer));
  } catch {
    // Not gzip — treat the payload as plain base64 of UTF-8 JSON.
    return bytesToUtf8(bytes);
  }
}
