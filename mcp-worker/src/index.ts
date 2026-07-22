// Worker entry. Phase 0: serve the McpAgent over Streamable HTTP at /mcp on
// *.workers.dev (no auth yet). Phase 1 wraps /mcp with the OAuth provider and
// adds the /w_XXXX/mcp token path.

import { IlolinkMCP } from "./agent";

// Re-export so wrangler can bind the Durable Object class.
export { IlolinkMCP };

// static serve() → a { fetch } handler managing the Streamable HTTP transport.
export default IlolinkMCP.serve("/mcp");
