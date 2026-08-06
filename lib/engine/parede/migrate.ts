import type { ElementoParede } from "./types";

// Migração de leitura para `ElementoParede` gravado em `parede.elementos`
// (jsonb) antes dos campos `id`/`nome`/`refX`/`refY` existirem (Modelo de
// Domínio, Seção 3.2.2, [V2.1]). Mesmo padrão de `lib/engine/box/migrate.ts`:
// roda em toda leitura, idempotente (elemento já no formato novo passa
// direto), sem reescrever nada no banco. NEUTRA por definição: `x`/`y`
// continuam sendo a mesma borda esquerda/chão que já eram — só ganham
// `refX: "esquerda"`/`refY: "chao"`, que é a leitura que esse dado sempre
// teve implicitamente.
export function migrarElementoParede(raw: ElementoParede): ElementoParede {
  return {
    ...raw,
    id: raw.id ?? crypto.randomUUID(),
    refX: raw.refX ?? "esquerda",
    refY: raw.refY ?? "chao",
  };
}
