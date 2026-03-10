import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FirewallaClient } from "../firewalla-client.js";

export function registerAlarmTools(server: McpServer, client: FirewallaClient) {
  server.tool(
    "get_alarms",
    "List active security alarms from Firewalla (intrusion attempts, abnormal uploads, etc.)",
    async () => {
      try {
        const result = await client.getAlarms();
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
          content: [{ type: "text" as const, text: `Error fetching alarms: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
