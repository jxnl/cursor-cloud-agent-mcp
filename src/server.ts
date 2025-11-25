import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { setupServer } from "./backend.js";

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

const server = new McpServer({
  name: "cursor-cloud-agent-mcp",
  version: "1.0.2",
});

setupServer(server);

// ============================================================================
// HTTP SERVER
// ============================================================================

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "cursor-cloud-agent-mcp",
    version: "1.0.2",
  });
});

app.post("/mcp", async (req, res) => {
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => transport.close());

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, () => {
  console.log(`Cloud Agent MCP Server: http://localhost:${port}/mcp`);
});
