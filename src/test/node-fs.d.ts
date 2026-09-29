/**
 * Tests run in Node and some read repository files (the brain meshes). This declares the one
 * Node API they use; the app itself never imports it.
 */
declare module 'node:fs' {
  export function readFileSync(path: string | URL): Uint8Array;
}
