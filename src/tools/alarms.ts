import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FirewallaClient } from "../firewalla-client.js";

export function registerAlarmTools(server: McpServer, client: FirewallaClient) {
  server.tool(
    "get_alarms",
    "List active security alarms from Firewalla (intrusion attempts, abnormal uploads, etc.). Supports filtering by severity, type, and device.",
    {
      severity: z.string().optional().describe("Filter by severity level (e.g. 'critical', 'major', 'minor', 'info')"),
      type: z.string().optional().describe("Filter by alarm type (e.g. 'ALARM_NEW_DEVICE', 'ALARM_ABNORMAL_BANDWIDTH_USAGE', 'ALARM_GAME', 'ALARM_VULNERABILITY')"),
      mac: z.string().optional().describe("Filter alarms for a specific device by MAC address"),
      count: z.number().optional().describe("Max alarms to return (default all)"),
    },
    async ({ severity, type, mac, count }) => {
      try {
        const result = await client.getAlarms();
        let alarms: any[] = Array.isArray(result) ? result : ((result as any)?.alarms ?? []);

        if (severity) {
          const s = severity.toLowerCase();
          alarms = alarms.filter((a: any) =>
            (a.severity ?? "").toLowerCase() === s ||
            (a["p.severity"] ?? "").toLowerCase() === s
          );
        }
        if (type) {
          const t = type.toUpperCase();
          alarms = alarms.filter((a: any) =>
            (a.type ?? "").toUpperCase().includes(t)
          );
        }
        if (mac) {
          const m = mac.toUpperCase();
          alarms = alarms.filter((a: any) =>
            (a["p.device.mac"] ?? a.mac ?? "").toUpperCase() === m
          );
        }
        if (count !== undefined) {
          alarms = alarms.slice(0, Math.min(count, 5000));
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(alarms, null, 2),
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
