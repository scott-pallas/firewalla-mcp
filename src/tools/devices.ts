import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FirewallaClient } from "../firewalla-client.js";

export function registerDeviceTools(server: McpServer, client: FirewallaClient) {
  server.tool(
    "get_devices",
    "List all devices on the network (hostname, IP, MAC, manufacturer, online status)",
    async () => {
      try {
        const hosts = await client.getDevices();
        const devices = (Array.isArray(hosts) ? hosts : []).map((host) => ({
          name: host.bname || host.name || host.dhcpName || "Unknown",
          ip: host.ip,
          mac: host.mac,
          manufacturer: host.macVendor || "Unknown",
          lastActive: host.lastActive,
          firstFound: host.firstFound,
          interface: host.intf,
        }));
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(devices, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error fetching devices: ${message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_offline_devices",
    "List devices that have gone offline recently. Returns devices sorted by most recently seen, filtered by how many hours back to look.",
    {
      hoursBack: z.number().optional().describe("How many hours back to look for devices that went offline (default 24, max 720)"),
    },
    async ({ hoursBack }) => {
      try {
        const hosts = await client.getDevices();
        const devices = Array.isArray(hosts) ? hosts : [];
        const now = Math.floor(Date.now() / 1000);
        const hours = Math.min(hoursBack ?? 24, 720);
        const cutoff = now - hours * 3600;
        const tenMinAgo = now - 600;

        const offlineDevices = devices
          .filter((host: any) => {
            const lastActive = host.lastActive || 0;
            return lastActive < tenMinAgo && lastActive > cutoff;
          })
          .sort((a: any, b: any) => (b.lastActive || 0) - (a.lastActive || 0))
          .map((host: any) => ({
            name: host.bname || host.name || host.dhcpName || "Unknown",
            ip: host.ip,
            mac: host.mac,
            manufacturer: host.macVendor || "Unknown",
            lastActive: host.lastActive,
            lastActiveAgo: `${Math.round((now - (host.lastActive || 0)) / 3600)} hours ago`,
            interface: host.intf,
          }));

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(offlineDevices, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error fetching offline devices: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
