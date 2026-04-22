import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    // Forward every backend route prefix straight to FastAPI on :5000.
    // No /api rewrite — the backend mounts routes at the root (/auth, /booking, ...).
    proxy: {
      "/auth": { target: "http://localhost:5000", changeOrigin: true },
      "/booking": { target: "http://localhost:5000", changeOrigin: true },
      "/organizer": { target: "http://localhost:5000", changeOrigin: true },
      "/payment": {
        target: "http://localhost:5000",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/payment/, "/api/v1/payments"),
      },
      "/refund": {
        target: "http://localhost:5000",
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/refund/, "/api/v1/refunds"),
      },
      "/health": { target: "http://localhost:5000", changeOrigin: true },
    },
  },
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: true,
  },
});
