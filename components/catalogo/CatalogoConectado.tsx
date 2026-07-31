"use client";

import { CatalogoLab } from "./CatalogoLab";
import { criarProduto, atualizarProduto, alternarAtivoProduto } from "@/lib/produto/acoes";
import type { ProdutoRow } from "@/lib/produto/tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — "dono de I/O" de
// `/catalogo`, mesmo padrão de `PerfilConectado.tsx`: recebe os produtos já
// carregados pelo Server Component da rota e liga o `CatalogoLab`
// (presentational) às Server Actions de CRUD (`lib/produto/acoes.ts`). Único
// ponto onde `/catalogo` conversa com o Supabase.
export interface CatalogoConectadoProps {
  produtosIniciais: ProdutoRow[];
  erroCarregamento: boolean;
}

export function CatalogoConectado({ produtosIniciais, erroCarregamento }: CatalogoConectadoProps) {
  return (
    <CatalogoLab
      produtosIniciais={produtosIniciais}
      erroCarregamento={erroCarregamento}
      onCriar={criarProduto}
      onAtualizar={atualizarProduto}
      onAlternarAtivo={alternarAtivoProduto}
    />
  );
}
