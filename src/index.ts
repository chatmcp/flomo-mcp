#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { FlomoClient } from "./flomo.js";

/**
 * Parse command line arguments
 * Example: node index.js --flomo_api_url=https://flomoapp.com/iwh/xxx/xxx/
 */
function parseArgs() {
  const args: Record<string, string> = {};
  process.argv.slice(2).forEach((arg) => {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      args[key] = value;
    }
  });
  return args;
}

const args = parseArgs();
const apiUrl = args.flomo_api_url || process.env.FLOMO_API_URL || "";

/**
 * Create an MCP server with capabilities for tools (to write notes).
 */
const server = new Server(
  {
    name: "flomo-mcp",
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "write_note",
        description: "Write note to flomo",
        inputSchema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "Text content of the note with Markdown format",
            },
          },
          required: ["content"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "write_note": {
      if (!apiUrl) {
        throw new Error("flomo API URL not set");
      }

      const content = String(request.params.arguments?.content);
      if (!content) {
        throw new Error("Content is required");
      }

      const flomo = new FlomoClient({ apiUrl });
      const result = await flomo.writeNote({ content });

      return {
        content: [
          {
            type: "text",
            text: `Write note to flomo success: ${JSON.stringify(result)}`,
          },
        ],
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
