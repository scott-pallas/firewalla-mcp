import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FirewallaClient } from "../firewalla-client.js";

export function registerSystemTools(server: McpServer, client: FirewallaClient) {
  server.tool(
    "get_system_info",
    "Get Firewalla system information: firmware version, model, branch, uptime, public IP, CPU/memory usage, and hardware details",
    async () => {
      try {
        const init: any = await client.getInit();

        const systemInfo: Record<string, any> = {
          model: init.model ?? null,
          modelName: init.modelName ?? null,
          version: init.version ?? null,
          branch: init.branch ?? null,
          license: init.license ? (typeof init.license === "string" && init.license.length > 20 ? "[REDACTED]" : init.license) : null,
          publicIp: init.publicIp ?? init.ddns?.publicIp ?? null,
          uptime: init.sysInfo?.uptime ?? init.uptime ?? null,
          cpu: init.sysInfo?.cpu ?? null,
          memory: init.sysInfo?.mem ?? init.sysInfo?.memory ?? null,
          lastReboot: init.lastReboot ?? null,
          timezone: init.timezone ?? null,
          mode: init.mode ?? null,
        };

        // Network interface summary
        if (init.interfaces) {
          const interfaces: Record<string, any> = {};
          for (const [name, intf] of Object.entries<any>(init.interfaces)) {
            interfaces[name] = {
              ip: intf.ip_address ?? intf.ip4_address ?? null,
              mac: intf.mac_address ?? null,
              type: intf.type ?? null,
              gateway: intf.gateway ?? intf.gateway_ip ?? null,
              dns: intf.dns ?? null,
            };
          }
          systemInfo.interfaces = interfaces;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(systemInfo, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error fetching system info: ${message}` }],
          isError: true,
        };
      }
    },
  );
}
