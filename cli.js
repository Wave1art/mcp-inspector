#!/usr/bin/env node

const path = require('path');

// Parse CLI arguments
const args = process.argv.slice(2);
const config = {
  mcpPort: 6277,
  mcpUrl: null,
  inspectorPort: 6280,
  authMode: 'none',
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--port':
    case '--mcp-port':
      config.mcpPort = parseInt(args[++i], 10);
      break;
    case '--mcp-url':
      config.mcpUrl = args[++i];
      break;
    case '--inspector-port':
    case '-p':
      config.inspectorPort = parseInt(args[++i], 10);
      break;
    case '--auth':
      config.authMode = args[++i];
      break;
    case '--help':
    case '-h':
      console.log(`
MCP Dev Inspector

Usage: mcp-dev-inspector [options]

Options:
  --port, --mcp-port <n>     MCP server port (default: 6277)
  --mcp-url <url>            Full MCP server URL (overrides --port)
  --inspector-port, -p <n>   Inspector UI port (default: 6280)
  --auth <none|oauth>        Auth mode (default: none)
  -h, --help                 Show this help
`);
      process.exit(0);
  }
}

// Derive MCP URL
if (!config.mcpUrl) {
  config.mcpUrl = `http://127.0.0.1:${config.mcpPort}/mcp`;
}

// Start server
const { startServer } = require('./server/index.js');

startServer({
  mcpUrl: config.mcpUrl,
  inspectorPort: config.inspectorPort,
  authMode: config.authMode,
  distPath: path.join(__dirname, 'dist', 'browser'),
}).then(async () => {
  const url = `http://localhost:${config.inspectorPort}`;
  console.log(`\n  MCP Dev Inspector`);
  console.log(`  Inspector: ${url}`);
  console.log(`  MCP target: ${config.mcpUrl}`);
  console.log(`  Auth: ${config.authMode}\n`);

  // Dynamic import for ESM-only 'open' package
  const open = (await import('open')).default;
  open(url).catch(() => {});
});
