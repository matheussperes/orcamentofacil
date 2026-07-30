"use client";

import { EditorItemNucleo, type ResultadoSalvarItem } from "@/app/modulo/EditorItemNucleo";
import { salvarItemOrcamento } from "@/lib/orcamento/salvarItem";
import { usePageHeader } from "@/components/shell/PageHeaderContext";
import type { ModuloOrcamento } from "@/lib/orcamento";

// Task 13.3e (contrato .maestro/tmp/13.3e-contract.md) — o "dono de I/O"
// Supabase de `/orcamento/[id]/item/[itemId]`: recebe o item já achado pelo
// Server Component da rota (`lib/orcamento/buscar.ts::buscarItemDoOrcamento`)
// e liga o botão de salvar do `EditorItemNucleo` (presentational) à Server
// Action `salvarItemOrcamento` (`lib/orcamento/salvarItem.ts`). Mesmo padrão
// exato de `AmbientesTabConectada` (Task 13.3d) para a aba Ambientes.
export interface ItemEditorTabConectadaProps {
  orcamentoId: string;
  itemId: string;
  clienteNome: string;
  estadoInicial: ModuloOrcamento;
}

export function ItemEditorTabConectada({
  orcamentoId,
  itemId,
  clienteNome,
  estadoInicial,
}: ItemEditorTabConectadaProps) {
  const nomeItem =
    estadoInicial.origem === "custom_box" ? estadoInicial.box.nome : estadoInicial.placa.nome;

  // Breadcrumb da Topbar ("Orçamentos / <cliente> / <item>") — mesmo
  // mecanismo de `OrcamentoAbas` (Task 13.3c/`usePageHeader`).
  usePageHeader({
    breadcrumb: [
      { rotulo: "Orçamentos" },
      { rotulo: clienteNome, href: `/orcamento/${orcamentoId}` },
      { rotulo: nomeItem || "Editor de item" },
    ],
  });

  async function onSalvar(modulo: ModuloOrcamento): Promise<ResultadoSalvarItem> {
    return salvarItemOrcamento(orcamentoId, itemId, modulo);
  }

  return (
    <EditorItemNucleo estadoInicial={estadoInicial} onSalvar={onSalvar} rotuloBotaoSalvar="Salvar item" />
  );
}
