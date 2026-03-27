# Firewalla MCP Server POC

## What We're Building
A Model Context Protocol (MCP) server that talks to a Firewalla Gold via its local API (port 8833), providing READ-ONLY network security tools.

## Architecture
- **MCP Server** (TypeScript, stdio transport) — exposes tools to any MCP client
- **Firewalla Client** — uses `node-firewalla` library to talk to the box's local API
- **Auth** — ETP token with public/private keypair (generated via firewalla-tools pairing process)

## Target Environment
- Firewalla Gold, router mode, IP: 10.0.1.1, local API on port 8833
- Runs on macOS (same LAN as the Firewalla)
- Node.js 25+

## Key Dependencies
- `node-firewalla` (npm) — client library for Firewalla local API
- `@modelcontextprotocol/sdk` — MCP server SDK
- TypeScript

## MCP Tools to Implement (READ-ONLY ONLY)

### Phase 1 (complete)
1. `get_alarms` — List active security alarms (intrusion attempts, abnormal uploads, etc.)
2. `get_devices` — List all devices on the network (hostname, IP, MAC, manufacturer, online status)
3. `get_network_status` — Ping/health check of the Firewalla box
4. `get_device_flows` — Get recent network flows for a specific device (aggregate summary)
5. `get_network_stats` — Basic network statistics (bandwidth, connection counts)
6. `search_flows` — Search individual flow records with filters (domain, IP, port, category, time range, per-device)
7. `get_audit_logs` — Blocked/allowed traffic decisions from firewall rules

### Implementation note: search_flows / get_audit_logs
These tools use a custom `FWMessage` (not `FWGetMessage`) because the Firewalla firmware expects
flow query parameters flat in `msg.data`, not nested under `msg.data.value` like `FWGetMessage` does.

### Phase 2 (complete)
8. `get_rules` — List firewall rules/policies
9. `get_features` — List enabled/disabled features
10. `get_offline_devices` — Devices that went offline recently
11. `get_dns_queries` — DNS query logs (domains resolved by devices)
12. `get_vlans` — Network segments, VLANs, and network groups

### Implementation note: get_dns_queries
Uses the same `FWMessage` pattern as `search_flows` but with `dns: true, regular: false`.

### Implementation note: get_vlans
Tries `FWGetMessage("networkConfig")` first, falls back to extracting from init data.

### Phase 3 (complete)
13. `get_system_info` — Firmware version, model, uptime, public IP, CPU/memory
14. `get_top_talkers` — Devices ranked by bandwidth usage
15. `get_clients_by_network` — Devices grouped by network segment/VLAN
16. `get_vpn_status` — VPN connections (WireGuard, OpenVPN, mesh)
17. `get_target_lists` — Block/allow target lists
18. `get_network_performance` — WAN latency, packet loss, DNS response times
19. `get_wan_usage` — Per-WAN bandwidth breakdown

### Phase 3 enhancements to existing tools
- `get_alarms` — Added filtering by severity, type, and device MAC
- `get_rules` — Added filtering by action/target, rule summary with counts, disabled rule toggle

### Implementation note: get_target_lists
Tries `FWGetMessage("targetLists")` first, falls back to init data `targetLists` or `customizedCategories`.

### Security hardening (v2.0.0)
- All `count` parameters clamped to max 5000 in code (not just docs)
- Expanded sensitive key redaction list (token, credential, apiKey, passphrase, preSharedKey)
- Dependency vulnerability (hono prototype pollution) patched via npm audit fix

## STRICT CONSTRAINTS
- **READ-ONLY** — NO write operations, NO rule changes, NO alarm dismissal, NO device blocking
- Do NOT expose any tool that modifies state on the Firewalla
- Config via environment variables: FIREWALLA_IP, FIREWALLA_PUBLIC_KEY_PATH, FIREWALLA_PRIVATE_KEY_PATH
- Graceful error handling — if Firewalla is unreachable, return clear error, don't crash

## Project Structure
```
firewalla-mcp/
├── src/
│   ├── index.ts          # MCP server entry point
│   ├── firewalla-client.ts  # Firewalla API wrapper
│   └── tools/
│       ├── alarms.ts
│       ├── devices.ts
│       ├── dns.ts
│       ├── flows.ts
│       ├── network.ts
│       ├── rules.ts
│       ├── system.ts
│       ├── vlans.ts
│       └── vpn.ts
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Build & Run
- `npm run build` — compile TypeScript
- `npm run start` — start MCP server (stdio transport)
- Use `npx @modelcontextprotocol/inspector` to test

## Reference
- node-firewalla: https://github.com/lesleyxyz/node-firewalla
- firewalla-tools (for auth setup): https://github.com/lesleyxyz/firewalla-tools
- MCP SDK: https://github.com/modelcontextprotocol/typescript-sdk
