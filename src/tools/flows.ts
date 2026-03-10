import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FirewallaClient } from "../firewalla-client.js";

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
}
