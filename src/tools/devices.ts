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
    "get_top_talkers",
    "Get devices ranked by bandwidth usage (top talkers). Shows download, upload, and total bytes for each device over the recent period.",
    {
      count: z.number().optional().describe("Number of top devices to return (default 20)"),
      direction: z.string().optional().describe("Sort by: 'total' (default), 'download', or 'upload'"),
    },
    async ({ count, direction }) => {
      try {
        const initData = await client.getInit();
        const hosts = Array.isArray(initData.hosts) ? initData.hosts : [];
        const limit = Math.min(count ?? 20, 5000);
        const dir = (direction ?? "total").toLowerCase();

        const devices = hosts.map((host: any) => {
          const download = Number(host.download ?? host.flowsummary?.download ?? 0);
          const upload = Number(host.upload ?? host.flowsummary?.upload ?? 0);
          return {
            name: host.bname || host.name || host.dhcpName || "Unknown",
            ip: host.ip,
            mac: host.mac,
            manufacturer: host.macVendor || "Unknown",
            download,
            upload,
            total: download + upload,
            interface: host.intf,
          };
        });

        const sortKey = dir === "download" ? "download" : dir === "upload" ? "upload" : "total";
        devices.sort((a: any, b: any) => b[sortKey] - a[sortKey]);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(devices.slice(0, limit), null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error fetching top talkers: ${message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_clients_by_network",
    "Get connected devices grouped by network segment/VLAN. Shows which devices are on each network.",
    async () => {
      try {
        const initData = await client.getInit();
        const hosts = Array.isArray(initData.hosts) ? initData.hosts : [];
        const networkProfiles = initData.networkProfiles ?? {};

        // Build network name lookup
        const networkNames: Record<string, string> = {};
        for (const [id, profile] of Object.entries<any>(networkProfiles)) {
          networkNames[id] = profile.name ?? id;
        }

        // Group devices by interface/network
        const byNetwork: Record<string, any[]> = {};
        for (const host of hosts) {
          const intf = host.intf ?? "unknown";
          const networkName = networkNames[intf] ?? intf;
          if (!byNetwork[networkName]) {
            byNetwork[networkName] = [];
          }
          byNetwork[networkName].push({
            name: host.bname || host.name || host.dhcpName || "Unknown",
            ip: host.ip,
            mac: host.mac,
            manufacturer: host.macVendor || "Unknown",
            lastActive: host.lastActive,
          });
        }

        // Add counts and sort
        const result: Record<string, any> = {};
        for (const [network, devices] of Object.entries(byNetwork)) {
          result[network] = {
            count: devices.length,
            devices: devices.sort((a: any, b: any) =>
              (a.name ?? "").localeCompare(b.name ?? "")
            ),
          };
        }

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
          content: [{ type: "text" as const, text: `Error fetching clients by network: ${message}` }],
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
