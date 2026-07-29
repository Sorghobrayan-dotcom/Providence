import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';

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
  const glooKey = env['GLOO_API_KEY'] ?? env['VITE_GLOO_API_KEY'] ?? '';

  return {
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          providence: resolve(__dirname, 'providence.html'),
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
        '/gloo': {
          target: 'https://platform.ai.gloo.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/gloo/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (glooKey) proxyReq.setHeader('Authorization', `Bearer ${glooKey}`);
            });
          },
        },
      },
    },
  };
});
