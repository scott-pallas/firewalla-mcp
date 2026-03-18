import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { FirewallaClient } from "../firewalla-client.js";

export function registerRuleTools(server: McpServer, client: FirewallaClient) {
  server.tool(
    "get_rules",
    "List all firewall rules/policies including hit counts. Shows active rules including block rules, allow rules, route rules, and their targets (devices, groups, networks, domains, ports). Supports filtering by type and target.",
    {
      action: z.string().optional().describe("Filter by rule action: 'block', 'allow', 'route', 'qos', 'match'"),
      target: z.string().optional().describe("Filter rules that mention this target (domain, IP, MAC, category)"),
      disabled: z.boolean().optional().describe("Include disabled rules (default false — only active rules)"),
    },
    async ({ action, target, disabled }) => {
      try {
        const result = await client.getRules();
        let rules = Array.isArray(result) ? result : (result?.policies ?? result?.rules ?? []);

        if (!disabled) {
          rules = rules.filter((r: any) => !r.disabled);
        }

        if (action) {
          const a = action.toLowerCase();
          rules = rules.filter((r: any) =>
            (r.action ?? "").toLowerCase() === a
          );
        }

        if (target) {
          const t = target.toLowerCase();
          rules = rules.filter((r: any) => {
            const searchFields = [
              r.target, r.domain, r.dst, r.src, r.scope,
              r["target_name"], r["target_ip"],
              r.category, r.appName,
              JSON.stringify(r.scope),
            ].filter(Boolean).map((f: any) => String(f).toLowerCase());
            return searchFields.some((f: string) => f.includes(t));
          });
        }

        // Include hit count summary
        const summary = {
          total: rules.length,
          byAction: {} as Record<string, number>,
        };
        for (const rule of rules) {
          const act = rule.action ?? "unknown";
          summary.byAction[act] = (summary.byAction[act] ?? 0) + 1;
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ summary, rules }, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error fetching rules: ${message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_target_lists",
    "Get all target lists (block/allow lists) configured on the Firewalla. Shows custom domain lists, IP lists, and their associated rules.",
    async () => {
      try {
        const result = await client.getTargetLists();
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        // Fallback: try to extract from init data
        try {
          const init: any = await client.getInit();
          const targetLists = init.targetLists ?? init.customizedCategories ?? {};
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(targetLists, null, 2),
              },
            ],
          };
        } catch (fallbackError) {
          const message = error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: "text" as const, text: `Error fetching target lists: ${message}` }],
            isError: true,
          };
        }
      }
    },
  );
}
