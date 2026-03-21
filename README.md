# MCP Dev Inspector

A browser-based inspector for [Model Context Protocol (MCP)](https://modelcontextprotocol.io) servers. Connect to any MCP server, browse its tools, execute them with custom arguments, and inspect the JSON-RPC traffic — all from a local web UI.

Built for developers building or debugging MCP servers. Supports OAuth 2.0 authentication and works on Google Cloud Workstations.

## Quick Start

Run directly from GitHub using `npx` — no install required:

```bash
npx github:Wave1art/mcp-inspector
```

This builds (if needed), starts a local server, and opens the inspector in your browser.

## Usage

```bash
npx github:Wave1art/mcp-inspector [options]
```

### Options

| Flag | Default | Description |
|------|---------|-------------|
| `--mcp-url <url>` | — | Full URL of the MCP server to connect to |
| `--port`, `--mcp-port <n>` | `6277` | MCP server port (shorthand for `http://127.0.0.1:<n>`) |
| `--inspector-port`, `-p <n>` | `6280` | Port for the inspector UI |
| `--auth <none\|oauth>` | `none` | Authentication mode |
| `-h`, `--help` | — | Show help |

### Examples

```bash
# Connect to an MCP server on the default port (6277)
npx github:Wave1art/mcp-inspector

# Connect to an MCP server at a specific URL
npx github:Wave1art/mcp-inspector --mcp-url http://localhost:8080

# Use a custom inspector port
npx github:Wave1art/mcp-inspector -p 3000

# Connect with OAuth authentication
npx github:Wave1art/mcp-inspector --mcp-url https://my-mcp-server.example.com --auth oauth
```

## Installing as a Dev Dependency

You can also add it to a project so your team can run it via an npm script:

```bash
npm install --save-dev github:Wave1art/mcp-inspector
```

Then add a script to your `package.json`:

```json
{
  "scripts": {
    "inspect-mcp": "mcp-dev-inspector --mcp-url http://localhost:8080"
  }
}
```

Run it with:

```bash
npm run inspect-mcp
```

To pull the latest version:

```bash
npm install github:Wave1art/mcp-inspector
```

## Features

- **Tool browser** — lists all tools exposed by the MCP server, grouped by prefix
- **Tool executor** — fill in arguments via auto-generated forms and call tools directly
- **Smart response viewer** — renders results as tables, cards, markdown, or raw JSON depending on content
- **JSON-RPC log** — inspect every request and response between the inspector and the MCP server
- **OAuth support** — authenticate with MCP servers that require OAuth 2.0 (PKCE + dynamic client registration)
- **Dark mode** — toggle between light and dark themes
- **Collapsible panels** — hide the tools list or log panel to focus on what matters
- **CLI flags + UI input** — set the MCP server address via command-line flags or change it at runtime in the UI

## Development

```bash
# Install dependencies
npm install

# Start the Angular dev server (hot reload)
npm run dev

# Build for production
npm run build

# Run the production server locally
npm start

# Run tests
npm test
```

## Architecture

- **Frontend**: Angular 21 with Angular Material, standalone components, signals
- **Backend**: Express 5 with an HTTP proxy to the target MCP server
- **Auth**: OAuth 2.0 + PKCE with dynamic client registration
- **Transport**: JSON-RPC over HTTP, SSE for streaming
