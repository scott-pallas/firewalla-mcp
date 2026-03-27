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

  server.tool(
    "get_network_performance",
    "Get network performance metrics: WAN latency, packet loss, DNS response times, and connection quality from the network monitor.",
    async () => {
      try {
        const [monitorData, init] = await Promise.all([
          client.getNetworkMonitorData(),
          client.getInit(),
        ]);

        const performance: Record<string, any> = {
          networkMonitor: monitorData,
        };

        // Extract WAN info from init
        if (init.interfaces) {
          const wans: Record<string, any> = {};
          for (const [name, intf] of Object.entries<any>(init.interfaces)) {
            if (intf.type === "wan" || name.startsWith("eth0") || name === "wan") {
              wans[name] = {
                ip: intf.ip_address ?? intf.ip4_address ?? null,
                gateway: intf.gateway ?? intf.gateway_ip ?? null,
                dns: intf.dns ?? null,
                state: intf.state ?? null,
                carrier: intf.carrier ?? null,
              };
            }
          }
          if (Object.keys(wans).length > 0) {
            performance.wanInterfaces = wans;
          }
        }

        // Extract latency/quality data if available
        if (init.latestAllStateEvents) {
          performance.latestStateEvents = init.latestAllStateEvents;
        }
        if (init.networkMonitorData) {
          performance.extendedMonitor = init.networkMonitorData;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(performance, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error fetching network performance: ${message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_wan_usage",
    "Get per-WAN data usage breakdown. Shows bandwidth consumption per WAN interface with download/upload totals.",
    async () => {
      try {
        const [monthlyUsage, init] = await Promise.all([
          client.getMonthlyDataUsage(),
          client.getInit(),
        ]);

        const wanUsage: Record<string, any> = {
          monthlyUsage: monthlyUsage,
        };

        // Extract per-WAN stats from init if available
        if (init.wanDataUsage) {
          wanUsage.perWan = init.wanDataUsage;
        }
        if (init.multiWanStatus) {
          wanUsage.multiWanStatus = init.multiWanStatus;
        }
        if (init.wanStatus) {
          wanUsage.wanStatus = init.wanStatus;
        }

        // WAN interface details
        if (init.interfaces) {
          const wanInterfaces: Record<string, any> = {};
          for (const [name, intf] of Object.entries<any>(init.interfaces)) {
            if (intf.type === "wan" || name.startsWith("eth0") || name === "wan") {
              wanInterfaces[name] = {
                ip: intf.ip_address ?? intf.ip4_address ?? null,
                gateway: intf.gateway ?? intf.gateway_ip ?? null,
                state: intf.state ?? null,
                rx_bytes: intf.rx_bytes ?? null,
                tx_bytes: intf.tx_bytes ?? null,
              };
            }
          }
          if (Object.keys(wanInterfaces).length > 0) {
            wanUsage.wanInterfaces = wanInterfaces;
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(wanUsage, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error fetching WAN usage: ${message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_features",
    "List Firewalla features, global policy, per-network policy overrides, DoH (DNS over HTTPS) status, and system vulnerability scan status including external port scans, weak password scans, and UPnP port forwarding results",
    async () => {
      try {
        const result = await client.getFeatures();
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
          content: [{ type: "text" as const, text: `Error fetching features: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
