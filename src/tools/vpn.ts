import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FirewallaClient } from "../firewalla-client.js";
import { sanitizeNetworkConfig } from "../sanitize.js";

export function registerVpnTools(server: McpServer, client: FirewallaClient) {
  server.tool(
    "get_vpn_status",
    "Get VPN status including WireGuard, OpenVPN, and VPN mesh connections. Shows configured VPN profiles, connected clients, and connection health.",
    async () => {
      try {
        const init: any = await client.getInit();

        const vpnStatus: Record<string, any> = {};

        // VPN profiles (outgoing VPN connections)
        if (init.vpnProfiles) {
          vpnStatus.profiles = Object.entries<any>(init.vpnProfiles).map(([id, profile]) => ({
            id,
            name: profile.displayName ?? profile.name ?? id,
            type: profile.type ?? "unknown",
            state: profile.state ?? null,
            connected: !!profile.connected,
            serverIp: profile.serverIP ?? profile.server ?? null,
            localIp: profile.localIp ?? null,
            lastConnected: profile.lastConnected ?? null,
          }));
        }

        // VPN clients (incoming VPN connections / VPN server)
        if (init.vpnClients) {
          vpnStatus.clients = Object.entries<any>(init.vpnClients).map(([id, vpnClient]) => ({
            id,
            name: vpnClient.displayName ?? vpnClient.name ?? id,
            type: vpnClient.type ?? "unknown",
            state: vpnClient.state ?? null,
            connected: !!vpnClient.connected,
          }));
        }

        // WireGuard peers
        if (init.wgPeers) {
          vpnStatus.wireguardPeers = (Array.isArray(init.wgPeers) ? init.wgPeers : []).map((peer: any) => ({
            name: peer.name ?? peer.displayName ?? null,
            endpoint: peer.endpoint ?? null,
            allowedIPs: peer.allowedIPs ?? null,
            latestHandshake: peer.latestHandshake ?? null,
            transferRx: peer.transferRx ?? null,
            transferTx: peer.transferTx ?? null,
          }));
        }

        // VPN mesh / site-to-site (sanitize to redact keys)
        if (init.meshVPN || init.vpnMesh) {
          const mesh = init.meshVPN ?? init.vpnMesh;
          vpnStatus.mesh = sanitizeNetworkConfig(mesh);
        }

        // VPN server settings
        const policy = init.policy ?? {};
        if (policy.vpn) {
          vpnStatus.serverEnabled = !!policy.vpn.state;
        }
        if (policy.wireguard) {
          vpnStatus.wireguardServerEnabled = !!policy.wireguard.state;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(vpnStatus, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error fetching VPN status: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
