import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["app/**/*.test.{ts,tsx}"],
    globals: true,
    pool: "threads",
    setupFiles: ["./app/test-setup.ts"],
  },
  resolve: {
    alias: {
      "@/lib/logger": path.resolve(__dirname, "./app/lib/logger"),
      "@/lib/storage": path.resolve(__dirname, "./app/lib/storage"),
      "@/lib": path.resolve(__dirname, "./app/lib"),
      "@": path.resolve(__dirname, "."),
    },
  },
});
