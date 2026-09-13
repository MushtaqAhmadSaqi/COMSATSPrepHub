import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const plugins = [react()];

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
