"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KpisCatalogo } from "./KpisCatalogo";
import { TabelaProdutos } from "./TabelaProdutos";
import type { DadosProduto, ResultadoProduto } from "@/lib/produto/acoes";
import type { ProdutoRow } from "@/lib/produto/tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — componente
// PRESENTACIONAL de `/catalogo` (mesmo espírito de `PerfilLab`/
// `CorteMaterialLab`): recebe os produtos já carregados pelo Server
// Component da rota e as Server Actions de CRUD injetadas por
// `CatalogoConectado` (real) ou pelo harness `/dev/preview/catalogo`
// (no-op). Estado da lista é dono deste componente (mesmo padrão de
// `itensManuais` em `CorteMaterialLab`) — cada mutação bem-sucedida faz
// upsert local via `atualizarListaLocal`, sem re-buscar do servidor.
//
// Estado ERRO (Design-System.md Seção 8): `erroCarregamento` vem de
// `listarProdutos` quando a consulta falhou de verdade (distinto de "lista
// vazia", ver `lib/produto/listar.ts`) — substitui TODO o conteúdo, mesmo
// padrão de `CorteMaterialLab`/`FinanceiroLab` quando o motor não calcula.
//
// Task 4.1-4.3-4.5 (RF-30, catálogo unificado): as antigas `Tabs`/
// `TabsList`/`TabsContent` de categoria (Todos/Chapas/Ferragens/LEDs/
// Acessórios/Fita) e as 3 tabelas separadas deram lugar a um único
// `TabelaProdutos`, com seletor de categoria interno ao card — Design-
// System.md §7.8 (Tabs) segue documentando as abas de orçamento/perfil/
// biblioteca, mas não se aplica mais a esta tela (decisão de produto já
// registrada no Backlog).
export interface CatalogoLabProps {
  produtosIniciais: ProdutoRow[];
  erroCarregamento?: boolean;
  onCriar: (dados: DadosProduto) => Promise<ResultadoProduto>;
  onAtualizar: (id: string, dados: DadosProduto) => Promise<ResultadoProduto>;
  onAlternarAtivo: (id: string, ativo: boolean) => Promise<ResultadoProduto>;
}

export function CatalogoLab({
  produtosIniciais,
  erroCarregamento = false,
  onCriar,
  onAtualizar,
  onAlternarAtivo,
}: CatalogoLabProps) {
  const [produtos, setProdutos] = useState<ProdutoRow[]>(produtosIniciais);

  function atualizarListaLocal(produto: ProdutoRow) {
    setProdutos((atuais) => {
      const indice = atuais.findIndex((p) => p.id === produto.id);
      if (indice === -1) return [...atuais, produto];
      const novos = [...atuais];
      novos[indice] = produto;
      return novos;
    });
  }

  if (erroCarregamento) {
    return (
      <Alert variant="erro">
        <AlertDescription>
          Não foi possível carregar o catálogo de produtos. Atualize a página e tente novamente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <KpisCatalogo produtos={produtos} />
      <TabelaProdutos
        produtos={produtos}
        onCriar={onCriar}
        onAtualizar={onAtualizar}
        onAlternarAtivo={onAlternarAtivo}
        onSucesso={atualizarListaLocal}
      />
    </div>
  );
}
