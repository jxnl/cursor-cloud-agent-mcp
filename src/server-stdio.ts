import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupServer } from "./backend.js";

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

const server = new McpServer({
  name: "cursor-cloud-agent-mcp",
  version: "1.0.0",
});

setupServer(server);

// ============================================================================
// STDIO TRANSPORT
// ============================================================================

const transport = new StdioServerTransport();
await server.connect(transport);
