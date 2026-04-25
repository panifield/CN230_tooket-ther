import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    // Forward every backend route prefix straight to FastAPI on :5000.
    // No /api rewrite — the backend mounts routes at the root (/auth, /booking, ...).
    proxy: {
      "/auth": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/booking": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/organizer": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/staff": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/payment": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/payment/, "/api/v1/payments"),
      },
      "/refund": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/refund/, "/api/v1/refunds"),
      },
      "/database/image": { target: "http://127.0.0.1:5000", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:5000", changeOrigin: true },
    },
  },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
  },
});
