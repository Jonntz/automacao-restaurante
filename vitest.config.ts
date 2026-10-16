import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" lança erro fora do runtime de servidor do React; nos testes é um módulo vazio.
      "server-only": path.resolve(__dirname, "tests/helpers/server-only-vazio.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
  },
});
