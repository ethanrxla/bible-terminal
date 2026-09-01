import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // The third argument is the prefix filter. Passing '' loads unprefixed vars
  // too, which is what we want: NVIDIA_API_KEY deliberately has no VITE_
  // prefix so it can never be inlined into the client bundle.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      proxy: {
        // Mirrors api/nvidia/chat/completions.ts, which serves this same path
        // in production. The client is identical in both environments.
        '/api/nvidia': {
          target: 'https://integrate.api.nvidia.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nvidia/, '/v1'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Runs in Node, not the browser, so the key stays server-side.
              proxyReq.setHeader(
                'Authorization',
                `Bearer ${env.NVIDIA_API_KEY ?? ''}`
              );
            });
          },
        },
      },
    },
  };
});
