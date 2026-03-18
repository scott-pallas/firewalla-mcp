import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FirewallaClient, FlowFilter } from "../firewalla-client.js";

const FlowFilterSchema = z.object({
  domain: z.string().optional().describe("Filter by domain (e.g. 'example.com')"),
  ip: z.string().optional().describe("Filter by remote IP address"),
  port: z.number().optional().describe("Filter by port number"),
  category: z.string().optional().describe("Filter by intel category (e.g. 'av', 'games', 'social')"),
  app: z.string().optional().describe("Filter by app classification"),
});

export function registerFlowTools(server: McpServer, client: FirewallaClient) {
  server.tool(
    "get_device_flows",
    "Get recent network flows for a specific device by MAC address. Returns flow data from the Firewalla init payload.",
    {
      mac: z.string().describe("MAC address of the device (e.g. AA:BB:CC:DD:EE:FF)"),
    },
    async ({ mac }) => {
      try {
        const initData = await client.getInit();
        const hosts = Array.isArray(initData.hosts) ? initData.hosts : [];
        const normalizedMac = mac.toUpperCase();
        const device = hosts.find(
          (h: any) => h.mac && h.mac.toUpperCase() === normalizedMac,
        );

        if (!device) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No device found with MAC address: ${mac}`,
              },
            ],
            isError: true,
          };
        }

        const flowData = {
          device: {
            name: device.bname || device.name || device.dhcpName || "Unknown",
            ip: device.ip,
            mac: device.mac,
          },
          flowSummary: device.flowsummary,
          activities: device.activities,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(flowData, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Error fetching device flows: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "search_flows",
    "Search individual network flow records with filters. Returns per-connection details including destination IP, domain, port, protocol, bytes transferred, country, and app category. Supports filtering by device MAC, domain, IP, port, category, and time range.",
    {
      mac: z.string().optional().describe("Filter to a specific device by MAC address. Omit for all devices."),
      domain: z.string().optional().describe("Filter by destination domain (e.g. 'netflix.com')"),
      ip: z.string().optional().describe("Filter by destination IP address"),
      port: z.number().optional().describe("Filter by destination port number"),
      category: z.string().optional().describe("Filter by intel category (e.g. 'av', 'games', 'social', 'porn', 'intel')"),
      count: z.number().optional().describe("Max results to return (default 100, max 5000)"),
      hoursBack: z.number().optional().describe("How many hours back to search (default 24)"),
    },
    async ({ mac, domain, ip, port, category, count, hoursBack }) => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const hours = hoursBack ?? 24;
        const include: FlowFilter[] = [];
        if (domain) include.push({ domain });
        if (ip) include.push({ ip });
        if (port) include.push({ port });
        if (category) include.push({ category });

        const result = await client.searchFlows({
          mac,
          count: Math.min(count ?? 100, 5000),
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
              text: `Error searching flows: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_audit_logs",
    "Get audit logs showing blocked and allowed traffic decisions. Shows which connections were blocked by firewall rules and why. Supports filtering by device MAC, domain, IP, and time range.",
    {
      mac: z.string().optional().describe("Filter to a specific device by MAC address. Omit for all devices."),
      domain: z.string().optional().describe("Filter by domain"),
      ip: z.string().optional().describe("Filter by IP address"),
      count: z.number().optional().describe("Max results to return (default 100, max 5000)"),
      hoursBack: z.number().optional().describe("How many hours back to search (default 24)"),
    },
    async ({ mac, domain, ip, count, hoursBack }) => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const hours = hoursBack ?? 24;
        const include: FlowFilter[] = [];
        if (domain) include.push({ domain });
        if (ip) include.push({ ip });

        const result = await client.getAuditLogs({
          mac,
          count: Math.min(count ?? 100, 5000),
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
              text: `Error fetching audit logs: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
