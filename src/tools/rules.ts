import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FirewallaClient } from "../firewalla-client.js";

export function registerRuleTools(server: McpServer, client: FirewallaClient) {
  server.tool(
    "get_rules",
    "List all firewall rules/policies. Shows active rules including block rules, allow rules, route rules, and their targets (devices, groups, networks, domains, ports).",
    async () => {
      try {
        const result = await client.getRules();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error fetching rules: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
