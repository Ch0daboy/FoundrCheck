import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "lib/**/*.spec.ts",
      "**/*.spec.ts",
      "**/*.test.ts",
    ],
    exclude: [
      "node_modules/**",
      "dist/**",
      ".next/**",
      "tests/e2e/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      all: true,
      include: ["lib/**/*.ts"],
      exclude: [
        "lib/**/*.d.ts",
        "lib/**/index.ts",
        "lib/**/*.spec.ts",
      ],
    },
  },
});

