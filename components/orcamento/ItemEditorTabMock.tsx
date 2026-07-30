"use client";

import { EditorItemNucleo, caixaInicial, type ResultadoSalvarItem } from "@/app/modulo/EditorItemNucleo";
import type { ModuloOrcamento } from "@/lib/orcamento";

// Task 13.3e (contrato .maestro/tmp/13.3e-contract.md) — harness DEV-ONLY
// (`/dev/preview/orcamento/item`, `app/dev/preview/orcamento/item/page.tsx`):
// item MOCK (sem Supabase, sem sessão real) + "salvar" no-op que só simula a
// espera de rede, mesmo espírito de `AmbientesTabMock` (Task 13.3d).
const ITEM_MOCK: ModuloOrcamento = { origem: "custom_box", box: caixaInicial("Branco TX", "Cozinha") };

export function ItemEditorTabMock() {
  async function onSalvarMock(): Promise<ResultadoSalvarItem> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true };
  }

  return (
    <EditorItemNucleo estadoInicial={ITEM_MOCK} onSalvar={onSalvarMock} rotuloBotaoSalvar="Salvar item" />
  );
}
