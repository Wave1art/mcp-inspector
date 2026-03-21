const { createProxyMiddleware } = require('http-proxy-middleware');

function createMcpProxy(state) {
  return createProxyMiddleware({
    router: () => {
      // Extract just the origin (scheme + host + port) from the full mcpUrl
      const url = new URL(state.mcpUrl);
      return url.origin;
    },
    changeOrigin: true,
    pathRewrite: () => {
      // Rewrite the request path to the path portion of the configured mcpUrl
      // e.g. if mcpUrl is http://127.0.0.1:6277/mcp, rewrite to /mcp
      const url = new URL(state.mcpUrl);
      return url.pathname;
    },
    on: {
      proxyReq: (proxyReq, req) => {
        // Inject OAuth bearer token if available
        if (state.accessToken) {
          proxyReq.setHeader('Authorization', `Bearer ${state.accessToken}`);
        }
        // Forward mcp-session-id
        if (req.headers['mcp-session-id']) {
          proxyReq.setHeader('mcp-session-id', req.headers['mcp-session-id']);
        }
      },
      proxyRes: (proxyRes) => {
        // Disable buffering for SSE
        proxyRes.headers['cache-control'] = 'no-cache';
        proxyRes.headers['x-accel-buffering'] = 'no';
      },
    },
  });
}

module.exports = { createMcpProxy };
