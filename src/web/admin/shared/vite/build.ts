import type { BuildOptions } from 'vite';

/** Production Rollup output — split heavy vendors so the main chunk stays under Vite's default limit. */
export function createBuildOptions(): BuildOptions {
  return {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'maps';
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
          if (id.includes('@radix-ui')) return 'radix';
          if (
            id.includes('/react-dom/')
            || id.includes('/react/')
            || id.includes('react-router')
            || id.includes('scheduler/')
          ) {
            return 'react-vendor';
          }
          if (id.includes('@tanstack/react-query')) return 'query';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('date-fns')) return 'date-fns';
          if (id.includes('axios')) return 'http';
        },
      },
    },
  };
}
