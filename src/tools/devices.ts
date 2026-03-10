import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
}
