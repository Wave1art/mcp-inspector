const { createProxyMiddleware } = require('http-proxy-middleware');

function createMcpProxy(state) {
  return createProxyMiddleware({
    router: () => state.mcpUrl,
    changeOrigin: true,
    pathRewrite: { '^/mcp': '/mcp' },
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
