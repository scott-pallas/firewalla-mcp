# Firewalla MCP Server

A read-only [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that connects to your **Firewalla Gold** via its local API — no MSP subscription required.

Built for AI-powered network security monitoring. Connect it to Claude Code, Claude Desktop, or any MCP-compatible client and query your firewall's alarms, devices, traffic flows, and network stats using natural language.

## Features

- **Read-only by design** — cannot modify rules, dismiss alarms, or change any settings
- **100% local** — talks directly to your Firewalla box on your LAN (port 8833), no cloud dependency
- **Free** — uses the local API, no MSP subscription needed
- **MCP standard** — works with any MCP client (Claude Code, Claude Desktop, etc.)

## Tools

| Tool | Description |
|------|-------------|
| `get_alarms` | List active security alarms (intrusion attempts, abnormal uploads, etc.) |
| `get_devices` | List all network devices (name, IP, MAC, manufacturer, last active) |
| `get_network_status` | Ping/health check — is the Firewalla box alive? |
| `get_network_stats` | Monthly bandwidth, speed test results, network monitor data |
| `get_device_flows` | Recent network flows for a specific device (by MAC address) |
| `search_flows` | Search individual flow records with filters (domain, IP, port, category, time range) |
| `get_audit_logs` | Blocked/allowed traffic decisions — see what your firewall rules caught |
| `get_rules` | List firewall rules/policies (block, allow, route rules with targets and hit counts) |
| `get_features` | List enabled/disabled Firewalla features (ad block, VPN, safe search, etc.) |
| `get_offline_devices` | Devices that recently went offline (configurable lookback window) |
| `get_dns_queries` | DNS query logs — every domain a device resolved (more complete than flow data) |
| `get_vlans` | Network segments, VLANs, WAN config, and network groups (sensitive data redacted) |

## Prerequisites

- **Firewalla Gold** (other models may work but are untested)
- **Node.js 18+**
- Your Mac/PC must be on the **same network** as the Firewalla
- An **ETP keypair** (generated during one-time pairing — see below)

## Installation

```bash
git clone https://github.com/scott-pallas/firewalla-mcp.git
cd firewalla-mcp
npm install
npm run build
```

## Pairing (One-Time Setup)

Before the MCP server can talk to your Firewalla, you need to generate an authentication keypair (ETP token). This is the same pairing mechanism the Firewalla mobile app uses — think of it as registering a new "device" with your Firewalla box.

This step uses a separate utility called [firewalla-tools](https://github.com/lesleyxyz/firewalla-tools). It is **not** a dependency of this project — you only need it once to generate your `.pem` key files. After pairing is complete, you can delete it.

### 1. Clone firewalla-tools (temporary)

```bash
git clone https://github.com/lesleyxyz/firewalla-tools.git
cd firewalla-tools
npm install
```

### 2. Enable Additional Pairing

In the **Firewalla app** on your phone:

1. Tap your Firewalla box
2. Go to **Settings** → **Advanced** → **Allow Additional Pairing**
3. Toggle it **ON** — a QR code will appear on screen

### 3. Get the QR Code JSON

The pairing tool needs the JSON data encoded in the QR code. To get it:

1. **Screenshot** the QR code shown in the Firewalla app
2. Scan the screenshot with a QR code reader app (or use your phone's built-in camera)
3. The QR code decodes to a JSON string that looks like:
   ```json
   {"gid":"...","seed":"...","license":"...","ek":"...","ipaddress":"..."}
   ```
4. Copy that JSON string — you'll paste it in the next step

### 4. Generate the Keypair

From the `firewalla-tools` directory:

```bash
cd create-etp-token
node index.js
```

The tool will prompt you for:

1. **Email** — just a label (e.g., `you@example.com`), used for display in the Firewalla app
2. **QR code JSON** — paste the JSON string from step 3
3. **Firewalla IP** — your box's IP address (e.g., `10.0.1.1` — this is usually your default gateway)
4. **Create new keypair?** — choose **Yes**

This generates `etp.public.pem` and `etp.private.pem` in the current directory.

> **Tip:** To find your Firewalla's IP, run `netstat -rn | grep default` — the gateway IP is your Firewalla.

### 5. Store the Keys

Move the `.pem` files somewhere secure:

```bash
mkdir -p ~/.firewalla
mv etp.public.pem etp.private.pem ~/.firewalla/
chmod 600 ~/.firewalla/*.pem
```

**Keep these files safe** — they are your authentication credentials.

### 6. Clean Up

You no longer need `firewalla-tools` — feel free to delete it:

```bash
cd ../..
rm -rf firewalla-tools
```

## Usage

### With Claude Code

Add the server to your global config (`~/.claude.json`) under `mcpServers`:

```json
{
  "mcpServers": {
    "firewalla": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/firewalla-mcp/dist/index.js"],
      "env": {
        "FIREWALLA_IP": "10.0.1.1",
        "FIREWALLA_PUBLIC_KEY_PATH": "/Users/yourname/.firewalla/etp.public.pem",
        "FIREWALLA_PRIVATE_KEY_PATH": "/Users/yourname/.firewalla/etp.private.pem"
      }
    }
  }
}
```

Then restart Claude Code. The Firewalla tools will be available in all sessions.

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "firewalla": {
      "command": "node",
      "args": ["/path/to/firewalla-mcp/dist/index.js"],
      "env": {
        "FIREWALLA_IP": "10.0.1.1",
        "FIREWALLA_PUBLIC_KEY_PATH": "/Users/yourname/.firewalla/etp.public.pem",
        "FIREWALLA_PRIVATE_KEY_PATH": "/Users/yourname/.firewalla/etp.private.pem"
      }
    }
  }
}
```

### With MCP Inspector (debugging)

```bash
FIREWALLA_IP=10.0.1.1 \
FIREWALLA_PUBLIC_KEY_PATH=~/.firewalla/etp.public.pem \
FIREWALLA_PRIVATE_KEY_PATH=~/.firewalla/etp.private.pem \
npx @modelcontextprotocol/inspector node dist/index.js
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FIREWALLA_PUBLIC_KEY_PATH` | Yes | — | Path to `etp.public.pem` |
| `FIREWALLA_PRIVATE_KEY_PATH` | Yes | — | Path to `etp.private.pem` |
| `FIREWALLA_IP` | No | `10.0.1.1` | Your Firewalla's IP address |

## Example Queries

Once connected to an MCP client, try:

- *"Show me all active security alarms"*
- *"List every device on my network"*
- *"What are the top bandwidth consumers this month?"*
- *"Show me network flows for device AA:BB:CC:DD:EE:FF"*
- *"Is my Firewalla box healthy?"*
- *"Search for all connections to netflix.com in the last 24 hours"*
- *"Show me flows from my MacBook to any gaming servers"*
- *"What traffic has been blocked by the firewall today?"*
- *"Find any connections to tracking or spyware domains"*
- *"Show me all my firewall rules"*
- *"What Firewalla features are enabled?"*
- *"Which devices went offline in the last 12 hours?"*
- *"What DNS queries did my smart TV make today?"*
- *"Show me my network segments and VLANs"*

## Project Structure

```
firewalla-mcp/
├── src/
│   ├── index.ts              # MCP server entry (stdio transport)
│   ├── firewalla-client.ts   # Firewalla local API wrapper
│   └── tools/
│       ├── alarms.ts         # get_alarms
│       ├── devices.ts        # get_devices, get_offline_devices
│       ├── dns.ts            # get_dns_queries
│       ├── flows.ts          # get_device_flows, search_flows, get_audit_logs
│       ├── network.ts        # get_network_status, get_network_stats
│       ├── rules.ts          # get_rules, get_features
│       └── vlans.ts          # get_vlans
├── dist/                     # Compiled JS (after build)
├── package.json
├── tsconfig.json
└── CLAUDE.md                 # AI agent project spec
```

## Security

- **Read-only only** — this server cannot modify your Firewalla configuration
- **Local network only** — communicates directly with your Firewalla box, no cloud relay
- **Key-based auth** — uses the same ETP token mechanism as the Firewalla mobile app
- **Sensitive data redacted** — WiFi passwords, WireGuard private keys, and other credentials are automatically redacted from tool output
- **Keep your `.pem` files secure** — they grant read access to your network data

## Credits

- [node-firewalla](https://github.com/lesleyxyz/node-firewalla) — Firewalla local API client library
- [firewalla-tools](https://github.com/lesleyxyz/firewalla-tools) — One-time pairing utility for generating ETP auth keys (not a runtime dependency)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — Model Context Protocol server framework

## License

MIT — see [LICENSE](LICENSE)
