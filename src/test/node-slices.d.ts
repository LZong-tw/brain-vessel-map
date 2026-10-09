/** Node APIs used only by the slice asset and loader tests. */
declare module 'node:zlib' {
  export function gzipSync(data: Uint8Array): Uint8Array;
  export function gunzipSync(data: Uint8Array): Uint8Array;
}

declare module 'node:crypto' {
  interface Hash {
    update(data: Uint8Array): Hash;
    digest(encoding: 'hex'): string;
  }
  export function createHash(algorithm: 'sha256'): Hash;
}
