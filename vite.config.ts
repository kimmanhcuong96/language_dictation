import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const API_PROXY_TARGET = "https://me2listen.kimmanhcuong96.workers.dev";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": { target: API_PROXY_TARGET, changeOrigin: true },
      "/auth": { target: API_PROXY_TARGET, changeOrigin: true },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
