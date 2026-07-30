import { defineConfig, loadEnv, type Plugin } from 'vite';
import { resolve } from 'node:path';

import { GlooTokenSource } from './src/api/glooToken';

/**
 * Gloo is not a static key. It is an OAuth2 client-credentials exchange: the
 * client id and secret buy a bearer token that expires, so the credential
 * cannot simply be pinned to an outgoing header the way YouVersion's App Key
 * can. That makes it a small middleware rather than a proxy rule — it has to
 * await a token before it can forward anything.
 *
 * The secret stays in this Node process. What the browser gets is a same-origin
 * path with no credential in it at all.
 */
function glooProxy(clientId: string, clientSecret: string): Plugin {
  const tokens = new GlooTokenSource({ clientId, clientSecret });

  return {
    name: 'gloo-credentials',
    configureServer(server) {
      server.middlewares.use('/gloo', (req, res) => {
        void (async () => {
          const token = await tokens.token();
          if (!token) {
            /* Say which of the two it is. A missing key and a rejected one look
               identical from the browser otherwise, and that is an afternoon. */
            res.statusCode = tokens.isConfigured ? 502 : 503;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: tokens.isConfigured
                ? 'Gloo refused the client credentials.'
                : 'No GLOO_CLIENT_ID / GLOO_CLIENT_SECRET in .env',
            }));
            return;
          }

          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);

          const upstream = await fetch(
            `https://platform.ai.gloo.com${req.url ?? '/'}`,
            {
              method: req.method ?? 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              ...(chunks.length > 0 ? { body: Buffer.concat(chunks) } : {}),
            },
          );

          // a token Gloo no longer accepts must not stay cached
          if (upstream.status === 401) tokens.forget();

          res.statusCode = upstream.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(await upstream.text());
        })().catch(() => {
          res.statusCode = 502;
          res.end('{"error":"gloo unreachable"}');
        });
      });
    },
  };
}

/**
 * The browser never sees a key.
 *
 * Anything Vite exposes to client code must be prefixed VITE_, and everything
 * so prefixed is compiled into the bundle: on a deployed site, opening the dev
 * tools would reveal it. So the App Keys here are deliberately NOT prefixed.
 * They stay in the Node process, and the browser talks to a same-origin path
 * that this proxy rewrites, attaching the credential server side on the way out.
 *
 * The same shape works in production behind any serverless function: keep the
 * path, move the header injection into the function.
 */
export default defineConfig(({ mode }) => {
  // '' loads every var, prefixed or not; these two never reach the client
  const env = loadEnv(mode, process.cwd(), '');
  const youVersionKey = env['YOUVERSION_APP_KEY'] ?? env['VITE_YOUVERSION_API_KEY'] ?? '';
  const glooId = env['GLOO_CLIENT_ID'] ?? '';
  const glooSecret = env['GLOO_CLIENT_SECRET'] ?? '';

  return {
    plugins: [glooProxy(glooId, glooSecret)],
    build: {
      rollupOptions: {
        input: {
          // the editor is the front door; the boss fight is an older sample
          providence: resolve(__dirname, 'index.html'),
          nuitDuBaton: resolve(__dirname, 'nuit-du-baton.html'),
        },
      },
    },
    server: {
      proxy: {
        '/scripture': {
          target: 'https://api.youversion.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/scripture/, '/v1'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (youVersionKey) proxyReq.setHeader('X-YVP-App-Key', youVersionKey);
              proxyReq.setHeader('Accept', 'application/json');
            });
          },
        },
        // '/gloo' is handled by the plugin above, which has to await a token
      },
    },
  };
});
