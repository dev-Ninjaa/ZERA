// Midnight's indexer provider imports `WebSocket` from `isomorphic-ws` even
// in browser bundles. The browser build of that package does not expose the
// named export, while the native API is exactly what the provider needs.
export const WebSocket = globalThis.WebSocket;
export default WebSocket;
