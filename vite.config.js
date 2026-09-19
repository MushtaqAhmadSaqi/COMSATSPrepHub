import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

  const plugins = [react(), localApiPlugin()];

  // Bundle analysis — run with: npm run analyze
  if (mode === 'analyze') {
    import('rollup-plugin-visualizer').then(({ visualizer }) => {
      plugins.push(
        visualizer({ open: true, filename: 'dist/bundle-stats.html', gzipSize: true })
      );
    });
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
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-motion': ['framer-motion'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-gemini': ['@google/generative-ai'],
          }
        }
      }
    }
  };
});

function localApiPlugin() {
  return {
    name: 'local-api-routes',
    configureServer(server) {
      server.middlewares.use('/api/generate-quiz', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        try {
          const body = await readJsonBody(req);
          const { default: handler } = await import('./api/generate-quiz.js');

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
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message || 'Local API route failed.' }));
        }
      });
    }
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
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
