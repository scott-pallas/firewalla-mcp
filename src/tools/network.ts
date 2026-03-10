import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FirewallaClient } from "../firewalla-client.js";

export function registerNetworkTools(server: McpServer, client: FirewallaClient) {
  server.tool(
    "get_network_status",
    "Ping/health check of the Firewalla box — returns uptime and timestamp",
    async () => {
      try {
        const result = await client.ping();
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
          content: [
            {
              type: "text" as const,
              text: `Error: Firewalla unreachable — ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_network_stats",
    "Get network statistics: monthly bandwidth usage, recent speed tests, and network monitor data",
    async () => {
      try {
        const [monthlyUsage, speedTests, monitorData] = await Promise.all([
          client.getMonthlyDataUsage(),
          client.getSpeedtestResults(),
          client.getNetworkMonitorData(),
        ]);

        const stats = {
          monthlyDataUsage: monthlyUsage,
          recentSpeedTests: speedTests,
          networkMonitor: monitorData,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error fetching network stats: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
