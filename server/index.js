const express = require('express');
const path = require('path');
const { createMcpProxy } = require('./proxy');
const { createOAuthRouter } = require('./oauth');

function startServer({ mcpUrl, inspectorPort, authMode, distPath }) {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    // Shared state
    const state = {
      mcpUrl,
      authMode,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      // OAuth discovery state
      oauthState: null,
      codeVerifier: null,
      authServerMeta: null,
      clientId: null,
      redirectUri: `http://localhost:${inspectorPort}/api/oauth/callback`,
      resource: null,
    };

    // Config API
    app.get('/api/config', (req, res) => {
      res.json({
        mcpUrl: state.mcpUrl,
        authMode: state.authMode,
      });
    });

    app.post('/api/config', (req, res) => {
      if (req.body.mcpUrl) state.mcpUrl = req.body.mcpUrl;
      if (req.body.authMode) state.authMode = req.body.authMode;
      res.json({ ok: true });
    });

    // OAuth routes
    app.use('/api/oauth', createOAuthRouter(state, inspectorPort));

    // MCP proxy - must come after API routes
    app.use('/mcp', createMcpProxy(state));

    // Serve Angular dist
    app.use(express.static(distPath));

    // SPA fallback (Express v5 syntax)
    app.get('/{*path}', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    const server = app.listen(inspectorPort, () => {
      resolve(server);
    });
  });
}

module.exports = { startServer };
