import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FirewallaClient } from "../firewalla-client.js";

function sanitizeNetworkConfig(config: any): any {
  if (config == null || typeof config !== "object") return config;

  if (Array.isArray(config)) {
    return config.map(sanitizeNetworkConfig);
  }

  const sensitiveKeys = new Set([
    "privateKey",
    "key",
    "encryption",
    "password",
    "secret",
    "psk",
  ]);

  const result: any = {};
  for (const [k, v] of Object.entries(config)) {
    if (sensitiveKeys.has(k) && typeof v === "string") {
      result[k] = "[REDACTED]";
    } else if (k === "profile" && typeof v === "object" && v !== null) {
      // WiFi SSID profiles contain passwords in "key" field
      const profiles: any = {};
      for (const [pid, profile] of Object.entries(v as Record<string, any>)) {
        profiles[pid] = sanitizeNetworkConfig(profile);
      }
      result[k] = profiles;
    } else if (k === "extra" && typeof v === "object" && v !== null && (v as any).peers) {
      // WireGuard extra.peers contain privateKey
      const extra = { ...v as any };
      extra.peers = (extra.peers as any[]).map((peer: any) => {
        const { privateKey, ...rest } = peer;
        return { ...rest, ...(privateKey ? { privateKey: "[REDACTED]" } : {}) };
      });
      result[k] = extra;
    } else if (typeof v === "object") {
      result[k] = sanitizeNetworkConfig(v);
    } else {
      result[k] = v;
    }
  }
  return result;
}

export function registerVlanTools(server: McpServer, client: FirewallaClient) {
  server.tool(
    "get_vlans",
    "List network segments, VLANs, and network groups configured on the Firewalla. Shows network names, subnets, VLAN IDs, and which interfaces they're on.",
    async () => {
      try {
        const result = await client.getNetworkConfig();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(sanitizeNetworkConfig(result), null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        try {
          const initData = await client.getInit();
          const networkInfo = {
            interfaces: initData.interfaces,
            networkConfig: initData.networkConfig,
            tags: initData.tags,
          };
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(sanitizeNetworkConfig(networkInfo), null, 2),
              },
            ],
          };
        } catch (fallbackError) {
          return {
            content: [{ type: "text" as const, text: `Error fetching VLANs: ${message}` }],
            isError: true,
          };
        }
      }
    },
  );
}
