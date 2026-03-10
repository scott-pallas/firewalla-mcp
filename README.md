# Firewalla MCP Server

A read-only [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that connects to your **Firewalla Gold** via its local API — no MSP subscription required.

Built for AI-powered network security monitoring. Connect it to Claude, OpenClaw, or any MCP-compatible client and query your firewall's alarms, devices, traffic flows, and network stats using natural language.

## Features

- 🔒 **Read-only by design** — cannot modify rules, dismiss alarms, or change any settings
- 🏠 **100% local** — talks directly to your Firewalla box on your LAN (port 8833), no cloud dependency
- 💸 **Free** — uses the local API, no MSP subscription needed
- 🔌 **MCP standard** — works with any MCP client (Claude Desktop, Claude Code, OpenClaw, etc.)

## Tools

| Tool | Description |
|------|-------------|
| `get_alarms` | List active security alarms (intrusion attempts, abnormal uploads, etc.) |
| `get_devices` | List all network devices (name, IP, MAC, manufacturer, last active) |
| `get_network_status` | Ping/health check — is the Firewalla box alive? |
| `get_network_stats` | Monthly bandwidth, speed test results, network monitor data |
| `get_device_flows` | Recent network flows for a specific device (by MAC address) |

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

Before the MCP server can talk to your Firewalla, you need to create an authentication keypair. This is similar to pairing a new device with your Firewalla app.

### 1. Install firewalla-tools

```bash
git clone https://github.com/lesleyxyz/firewalla-tools.git
cd firewalla-tools
npm install
```

### 2. Enable Additional Pairing

Open the **Firewalla app** → tap your box → **Settings → Advanced → Allow Additional Pairing** → toggle it on.

### 3. Generate the Keypair

```bash
node create-etp-token
```

Follow the prompts:
- Enter an email (just a label — used for display in the app)
- Scan/screenshot the QR code from the Firewalla app and paste its JSON value
- Enter your Firewalla's IP address (e.g., `10.0.1.1`)
- Choose "Yes" to create a new keypair

This generates `etp.public.pem` and `etp.private.pem`. **Keep these files safe** — they are your authentication credentials.

### 4. Store the Keys

Move the `.pem` files somewhere secure:

```bash
mkdir -p ~/.firewalla
mv etp.public.pem etp.private.pem ~/.firewalla/
chmod 600 ~/.firewalla/*.pem
```

## Configuration

Create a `.env` file (or set environment variables):

```bash
# Required
FIREWALLA_PUBLIC_KEY_PATH=/Users/yourname/.firewalla/etp.public.pem
FIREWALLA_PRIVATE_KEY_PATH=/Users/yourname/.firewalla/etp.private.pem

# Optional (defaults to 10.0.1.1)
FIREWALLA_IP=10.0.1.1
```

## Usage

### Standalone (test mode)

```bash
npm run start
```

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
npx @modelcontextprotocol/inspector node dist/index.js
```

## Example Queries

Once connected to an MCP client, try:

- *"Show me all active security alarms"*
- *"List every device on my network"*
- *"What are the top bandwidth consumers this month?"*
- *"Show me network flows for device AA:BB:CC:DD:EE:FF"*
- *"Is my Firewalla box healthy?"*

## Project Structure

```
firewalla-mcp/
├── src/
│   ├── index.ts              # MCP server entry (stdio transport)
│   ├── firewalla-client.ts   # Firewalla local API wrapper
│   └── tools/
│       ├── alarms.ts         # get_alarms
│       ├── devices.ts        # get_devices
│       ├── network.ts        # get_network_status, get_network_stats
│       └── flows.ts          # get_device_flows
├── dist/                     # Compiled JS (after build)
├── package.json
├── tsconfig.json
└── CLAUDE.md                 # AI agent project spec
```

## Roadmap

### Phase 2 (planned)
- `get_rules` — List firewall rules
- `get_features` — List enabled Firewalla features
- `search_flows` — Search flows by IP, domain, or time range
- `get_offline_devices` — Devices that recently went offline

### Future Ideas
- Scheduled security scan reports (via OpenClaw cron)
- Anomaly detection alerts
- Network topology visualization

## Security

- **Read-only only** — this server cannot modify your Firewalla configuration
- **Local network only** — communicates directly with your Firewalla box, no cloud relay
- **Key-based auth** — uses the same ETP token mechanism as the Firewalla mobile app
- **Keep your `.pem` files secure** — they grant read access to your network data

## Credits

- [node-firewalla](https://github.com/lesleyxyz/node-firewalla) — Firewalla local API client library
- [firewalla-tools](https://github.com/lesleyxyz/firewalla-tools) — Auth token generation tools
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — Model Context Protocol server framework

## License

MIT
