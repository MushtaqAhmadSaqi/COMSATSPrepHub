import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const MAX_QUIZ_API_BYTES = 16 * 1024;
const MAX_OCR_API_BYTES = 5 * 1024 * 1024;

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  const plugins = [react(), localApiPlugin()];

  if (mode === 'analyze') {
    import('rollup-plugin-visualizer').then(({ visualizer }) => {
      plugins.push(
        visualizer({ open: true, filename: 'dist/bundle-stats.html', gzipSize: true })
      );
    }).catch(() => {});
  }

  return {
    plugins,
    server: {
      port: 3000,
      open: true
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
              if (id.includes('framer-motion')) return 'vendor-motion';
              if (id.includes('@supabase')) return 'vendor-supabase';
            }
          }
        }
      }
    }
  };
});

function mountLocalRoute(server, routePath, modulePath, maxBytes) {
  server.middlewares.use(routePath, async (req, res) => {
    if (req.method !== 'POST' && req.method !== 'OPTIONS') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      const body = await readJsonBody(req, maxBytes);
      const { default: handler } = await import(modulePath);

      req.body = body;
      res.status = (statusCode) => {
        res.statusCode = statusCode;
        return res;
      };
      res.json = (payload) => {
        if (!res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', 'application/json');
        }
        res.end(JSON.stringify(payload));
        return res;
      };

      await handler(req, res);
    } catch (error) {
      const isTooLarge = error?.message === 'PAYLOAD_TOO_LARGE';
      res.statusCode = isTooLarge ? 413 : 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: isTooLarge
            ? 'Request payload is too large.'
            : 'Local API route encountered an unexpected error.'
        })
      );
    }
  });
}

function localApiPlugin() {
  return {
    name: 'local-api-routes',
    configureServer(server) {
      mountLocalRoute(server, '/api/generate-quiz', './api/generate-quiz.js', MAX_QUIZ_API_BYTES);
      mountLocalRoute(server, '/api/analyze-screenshot', './api/analyze-screenshot.js', MAX_OCR_API_BYTES);
    }
  };
}

function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > maxBytes) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}
