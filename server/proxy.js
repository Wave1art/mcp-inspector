/**
 * Manual MCP proxy — replaces http-proxy-middleware to ensure
 * SSE responses stream correctly and all headers (especially
 * mcp-session-id) are forwarded both ways.
 */
function createMcpProxy(state) {
  return async (req, res) => {
    try {
      const targetUrl = state.mcpUrl;

      // Build headers to forward
      const fwdHeaders = {
        'content-type': req.headers['content-type'] || 'application/json',
        'accept': req.headers['accept'] || 'application/json, text/event-stream',
      };
      if (req.headers['mcp-session-id']) {
        fwdHeaders['mcp-session-id'] = req.headers['mcp-session-id'];
      }
      if (state.accessToken) {
        fwdHeaders['authorization'] = `Bearer ${state.accessToken}`;
      }

      // Collect request body
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);

      // Forward to MCP server
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers: fwdHeaders,
        body: body.length > 0 ? body : undefined,
        // Don't follow redirects — surface them as errors
        redirect: 'error',
      });

      // Forward status
      res.status(upstream.status);

      // Forward response headers we care about
      const passthroughHeaders = [
        'content-type',
        'mcp-session-id',
        'cache-control',
      ];
      for (const h of passthroughHeaders) {
        const val = upstream.headers.get(h);
        if (val) res.setHeader(h, val);
      }
      // Always disable buffering for SSE
      res.setHeader('x-accel-buffering', 'no');

      // Stream the response body back
      if (upstream.body) {
        const reader = upstream.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              return;
            }
            res.write(value);
            // Flush immediately for SSE
            if (typeof res.flush === 'function') res.flush();
          }
        };
        await pump();
      } else {
        res.end();
      }
    } catch (err) {
      console.error('[proxy error]', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Proxy error', message: err.message });
      } else {
        res.end();
      }
    }
  };
}

module.exports = { createMcpProxy };
