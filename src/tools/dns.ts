import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FirewallaClient, FlowFilter } from "../firewalla-client.js";

export function registerDnsTools(server: McpServer, client: FirewallaClient) {
  server.tool(
    "get_dns_queries",
    "Get DNS query logs showing every domain a device attempted to resolve. More complete than flow data since it captures queries even for very brief connections. Supports filtering by device MAC, domain, and time range.",
    {
      mac: z.string().optional().describe("Filter to a specific device by MAC address. Omit for all devices."),
      domain: z.string().optional().describe("Filter by queried domain (e.g. 'example.com')"),
      count: z.number().optional().describe("Max results to return (default 100, max 5000)"),
      hoursBack: z.number().optional().describe("How many hours back to search (default 24)"),
    },
    async ({ mac, domain, count, hoursBack }) => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const hours = hoursBack ?? 24;
        const include: FlowFilter[] = [];
        if (domain) include.push({ domain });

        const result = await client.getDnsQueries({
          mac,
          count: count ?? 100,
          ts: now,
          ets: now - hours * 3600,
          include: include.length > 0 ? include : undefined,
        });

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
              text: `Error fetching DNS queries: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
