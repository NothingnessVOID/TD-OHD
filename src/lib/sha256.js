/** SHA-256 over exactly the supplied bytes, including a view's offset/length. */
export async function sha256Hex(bytes) {
  let input;
  if (bytes instanceof ArrayBuffer) input = new Uint8Array(bytes);
  else if (ArrayBuffer.isView(bytes)) input = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  else throw new TypeError('sha256Hex expects an ArrayBuffer or ArrayBuffer view');
  // Own a stable ordinary ArrayBuffer for WebCrypto and asynchronous fallback loading.
  input = Uint8Array.from(input);
  const subtle = globalThis.crypto?.subtle;
  const digest = subtle
    ? new Uint8Array(await subtle.digest('SHA-256', input))
    : (await import('@noble/hashes/sha2.js')).sha256(input);
  return [...digest].map(value => value.toString(16).padStart(2, '0')).join('');
}
