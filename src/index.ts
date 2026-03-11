import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { FirewallaClient } from "./firewalla-client.js";
import { registerAlarmTools } from "./tools/alarms.js";
import { registerDeviceTools } from "./tools/devices.js";
import { registerNetworkTools } from "./tools/network.js";
import { registerFlowTools } from "./tools/flows.js";
import { registerRuleTools } from "./tools/rules.js";
import { registerDnsTools } from "./tools/dns.js";
import { registerVlanTools } from "./tools/vlans.js";

const FIREWALLA_IP = process.env.FIREWALLA_IP || "10.0.1.1";
const PUBLIC_KEY_PATH = process.env.FIREWALLA_PUBLIC_KEY_PATH;
const PRIVATE_KEY_PATH = process.env.FIREWALLA_PRIVATE_KEY_PATH;

if (!PUBLIC_KEY_PATH || !PRIVATE_KEY_PATH) {
  console.error(
    "Missing required environment variables: FIREWALLA_PUBLIC_KEY_PATH and FIREWALLA_PRIVATE_KEY_PATH",
  );
  process.exit(1);
}

const server = new McpServer({
  name: "firewalla-mcp",
  version: "1.0.0",
});

const client = new FirewallaClient(FIREWALLA_IP, PUBLIC_KEY_PATH, PRIVATE_KEY_PATH);

registerAlarmTools(server, client);
registerDeviceTools(server, client);
registerNetworkTools(server, client);
registerFlowTools(server, client);
registerRuleTools(server, client);
registerDnsTools(server, client);
registerVlanTools(server, client);

async function main() {
  try {
    await client.connect();
    console.error("Connected to Firewalla at", FIREWALLA_IP);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Warning: Could not connect to Firewalla: ${message}`);
    console.error("Tools will return errors until connection is established.");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Firewalla MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
