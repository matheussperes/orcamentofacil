import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Task 13.3c: `ElevacaoParede.tsx`/`.test.ts` migraram de `app/ambientes/`
    // para `components/ambientes/` (extração de `AmbientesLab.tsx`,
    // reaproveitado tanto por `/ambientes` quanto pela aba "Ambientes" de
    // `/orcamento/[id]`) — sem este padrão, o teste parava de rodar
    // silenciosamente (Vitest só ignora, não falha, arquivo fora do
    // `include`).
    include: ["lib/**/*.test.ts", "app/**/*.test.ts", "components/**/*.test.ts"],
  },
});
