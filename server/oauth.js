const { Router } = require('express');
const crypto = require('crypto');

function base64url(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generatePKCE() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash('sha256').update(verifier).digest()
  );
  return { verifier, challenge };
}

function parseWWWAuthenticate(header) {
  if (!header) return {};
  const params = {};
  const regex = /(\w+)="([^"]+)"/g;
  let match;
  while ((match = regex.exec(header)) !== null) {
    params[match[1]] = match[2];
  }
  return params;
}

function createOAuthRouter(state, inspectorPort) {
  const router = Router();

  // Discover OAuth endpoints from MCP server
  router.post('/discover', async (req, res) => {
    const { mcpUrl } = req.body;
    if (!mcpUrl) {
      return res.status(400).json({ error: 'mcpUrl is required' });
    }

    try {
      state.resource = mcpUrl;

      // Step 1: Make initial request to MCP server to trigger 401
      const initResp = await fetch(mcpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      });

      if (initResp.status !== 401) {
        // Server doesn't require auth or is already accessible
        return res.json({
          message: 'Server did not require authentication',
          status: initResp.status,
        });
      }

      // Step 2: Parse WWW-Authenticate header
      const wwwAuth = initResp.headers.get('www-authenticate') || '';
      const authParams = parseWWWAuthenticate(wwwAuth);

      // Step 3: Fetch Protected Resource Metadata
      let resourceMetaUrl = authParams.resource_metadata;
      if (!resourceMetaUrl) {
        const mcpUrlObj = new URL(mcpUrl);
        resourceMetaUrl = `${mcpUrlObj.origin}/.well-known/oauth-protected-resource`;
      }

      const resourceMeta = await fetch(resourceMetaUrl).then(r => r.json()).catch(() => null);

      // Step 4: Determine authorization server
      let authServerUrl;
      if (resourceMeta?.authorization_servers?.length) {
        authServerUrl = resourceMeta.authorization_servers[0];
      } else {
        const mcpUrlObj = new URL(mcpUrl);
        authServerUrl = mcpUrlObj.origin;
      }

      // Step 5: Fetch Authorization Server Metadata
      const asMeta = await fetch(`${authServerUrl}/.well-known/oauth-authorization-server`)
        .then(r => r.json())
        .catch(() => null);

      if (!asMeta?.authorization_endpoint || !asMeta?.token_endpoint) {
        // Try OpenID Connect discovery
        const oidcMeta = await fetch(`${authServerUrl}/.well-known/openid-configuration`)
          .then(r => r.json())
          .catch(() => null);

        if (!oidcMeta?.authorization_endpoint || !oidcMeta?.token_endpoint) {
          return res.status(400).json({
            error: 'Could not discover authorization server metadata',
          });
        }
        state.authServerMeta = oidcMeta;
      } else {
        state.authServerMeta = asMeta;
      }

      // Step 6: Dynamic client registration if supported
      let clientId = 'mcp-dev-inspector';
      if (state.authServerMeta.registration_endpoint) {
        try {
          const regResp = await fetch(state.authServerMeta.registration_endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_name: 'MCP Dev Inspector',
              redirect_uris: [state.redirectUri],
              grant_types: ['authorization_code'],
              response_types: ['code'],
              token_endpoint_auth_method: 'none',
            }),
          });
          if (regResp.ok) {
            const regData = await regResp.json();
            clientId = regData.client_id;
          }
        } catch {
          // Fall back to default client_id
        }
      }
      state.clientId = clientId;

      // Step 7: Generate PKCE
      const { verifier, challenge } = generatePKCE();
      state.codeVerifier = verifier;

      // Step 8: Generate state parameter
      state.oauthState = base64url(crypto.randomBytes(16));

      // Step 9: Build authorization URL
      const authUrl = new URL(state.authServerMeta.authorization_endpoint);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', state.redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('state', state.oauthState);
      authUrl.searchParams.set('code_challenge', challenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      // Add scope
      const scope = authParams.scope ||
        (resourceMeta?.scopes_supported?.join(' ')) ||
        (state.authServerMeta.scopes_supported?.join(' '));
      if (scope) {
        authUrl.searchParams.set('scope', scope);
      }

      // Add resource parameter (RFC 8707)
      authUrl.searchParams.set('resource', mcpUrl);

      res.json({
        authorizationUrl: authUrl.toString(),
        state: state.oauthState,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Discovery failed' });
    }
  });

  // OAuth callback handler
  router.get('/callback', async (req, res) => {
    const { code, state: returnedState, error } = req.query;

    if (error) {
      state.accessToken = null;
      return res.send(callbackPage('Authorization denied: ' + error, false));
    }

    if (!code || returnedState !== state.oauthState) {
      return res.status(400).send(callbackPage('Invalid callback parameters', false));
    }

    try {
      // Exchange authorization code for tokens
      const tokenResp = await fetch(state.authServerMeta.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          code_verifier: state.codeVerifier,
          redirect_uri: state.redirectUri,
          client_id: state.clientId,
          resource: state.resource,
        }).toString(),
      });

      if (!tokenResp.ok) {
        const errData = await tokenResp.text();
        throw new Error(`Token exchange failed: ${tokenResp.status} ${errData}`);
      }

      const tokens = await tokenResp.json();
      state.accessToken = tokens.access_token;
      state.refreshToken = tokens.refresh_token || null;
      state.tokenExpiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      // Clean up PKCE state
      state.codeVerifier = null;
      state.oauthState = null;

      res.send(callbackPage('Authorization successful! You can close this tab.', true));
    } catch (err) {
      state.accessToken = null;
      res.status(500).send(callbackPage('Token exchange failed: ' + err.message, false));
    }
  });

  // OAuth status endpoint
  router.get('/status', (req, res) => {
    let authState = 'idle';
    if (state.accessToken) {
      authState = 'authenticated';
    } else if (state.oauthState) {
      authState = 'awaiting_callback';
    }

    res.json({
      state: authState,
      token: state.accessToken ? { expiresAt: state.tokenExpiresAt } : undefined,
      error: undefined,
    });
  });

  // Refresh token
  router.post('/refresh', async (req, res) => {
    if (!state.refreshToken || !state.authServerMeta?.token_endpoint) {
      return res.status(400).json({ error: 'No refresh token available' });
    }

    try {
      const tokenResp = await fetch(state.authServerMeta.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: state.refreshToken,
          client_id: state.clientId,
          resource: state.resource,
        }).toString(),
      });

      if (!tokenResp.ok) throw new Error('Refresh failed');

      const tokens = await tokenResp.json();
      state.accessToken = tokens.access_token;
      if (tokens.refresh_token) state.refreshToken = tokens.refresh_token;
      state.tokenExpiresAt = tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null;

      res.json({
        state: 'authenticated',
        token: { expiresAt: state.tokenExpiresAt },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Revoke / clear tokens
  router.post('/revoke', (req, res) => {
    state.accessToken = null;
    state.refreshToken = null;
    state.tokenExpiresAt = null;
    state.codeVerifier = null;
    state.oauthState = null;
    res.json({ ok: true });
  });

  return router;
}

function callbackPage(message, success) {
  const color = success ? '#16a34a' : '#dc2626';
  const icon = success ? '\u2714' : '\u2718';
  return `<!DOCTYPE html>
<html>
<head><title>MCP Dev Inspector - OAuth</title></head>
<body style="
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; margin: 0;
  font-family: -apple-system, sans-serif;
  background: #f5f5f7; color: #1a1a2e;
">
  <div style="text-align: center;">
    <div style="font-size: 48px; color: ${color};">${icon}</div>
    <p style="font-size: 16px; margin: 16px 0;">${message}</p>
    <p style="font-size: 12px; color: #888;">You can close this tab and return to the inspector.</p>
  </div>
</body>
</html>`;
}

module.exports = { createOAuthRouter };
