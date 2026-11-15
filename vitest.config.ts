import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.ts", "src/components/shared/AccessibleModal.tsx"],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
      },
    },
  },
});
