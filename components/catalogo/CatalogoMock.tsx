"use client";

import { CatalogoLab } from "./CatalogoLab";
import type { ResultadoProduto, DadosProduto } from "@/lib/produto/acoes";
import type { ProdutoRow } from "@/lib/produto/tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — harness DEV-ONLY
// (`/dev/preview/catalogo`), mesmo espírito de `PerfilMock.tsx`: sem
// Supabase, mutações no-op que devolvem um `ProdutoRow` fake (pra exercitar
// o upsert local do `CatalogoLab` de verdade) depois de simular espera de
// rede. Cobre as 5 categorias + um produto INATIVO (chapa) pra exercitar o
// badge/toggle "Inativo → Reativar".
const PRODUTOS_MOCK: ProdutoRow[] = [
  { id: "chapa-1", tipo: "chapa", nome: "Branco TX 15mm", especificacao: { cor: "Branco TX", espessura: 15 }, preco: 285, fornecedor: null, ativo: true, criadoEm: "2026-01-01T00:00:00.000Z" },
  { id: "chapa-2", tipo: "chapa", nome: "Branco TX 18mm", especificacao: { cor: "Branco TX", espessura: 18 }, preco: 315, fornecedor: null, ativo: true, criadoEm: "2026-01-01T00:00:00.000Z" },
  { id: "chapa-3", tipo: "chapa", nome: "Louro Freijó 15mm", especificacao: { cor: "Louro Freijó", espessura: 15 }, preco: 380, fornecedor: "Fornecedor XPTO", ativo: true, criadoEm: "2026-01-01T00:00:00.000Z" },
  { id: "chapa-4", tipo: "chapa", nome: "Cinza Sagrado 18mm (descontinuada)", especificacao: { cor: "Cinza Sagrado", espessura: 18 }, preco: 330, fornecedor: null, ativo: false, criadoEm: "2026-01-01T00:00:00.000Z" },
  { id: "ferragem-1", tipo: "ferragem", nome: "Dobradiça 35mm", especificacao: { codigo: "dobradica_35", unidade: "un" }, preco: 8, fornecedor: null, ativo: true, criadoEm: "2026-01-01T00:00:00.000Z" },
  { id: "ferragem-2", tipo: "ferragem", nome: "Corrediça (par)", especificacao: { codigo: "corredica_par", unidade: "par" }, preco: 45, fornecedor: null, ativo: true, criadoEm: "2026-01-01T00:00:00.000Z" },
  { id: "ferragem-3", tipo: "ferragem", nome: "Puxador", especificacao: { codigo: "puxador", unidade: "un" }, preco: 15, fornecedor: null, ativo: true, criadoEm: "2026-01-01T00:00:00.000Z" },
  { id: "fita-1", tipo: "fita", nome: "Fita de borda", especificacao: { unidade: "m" }, preco: 2.5, fornecedor: null, ativo: true, criadoEm: "2026-01-01T00:00:00.000Z" },
  { id: "led-1", tipo: "led", nome: "Fita de LED branco quente", especificacao: {}, preco: 40, fornecedor: null, ativo: true, criadoEm: "2026-01-01T00:00:00.000Z" },
  { id: "acessorio-1", tipo: "acessorio", nome: "Organizador de gaveta", especificacao: {}, preco: 60, fornecedor: null, ativo: true, criadoEm: "2026-01-01T00:00:00.000Z" },
];

async function esperar(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

export function CatalogoMock() {
  async function onCriarMock(dados: DadosProduto): Promise<ResultadoProduto> {
    await esperar();
    return {
      ok: true,
      produto: {
        id: `mock-${Date.now().toString(36)}`,
        tipo: dados.tipo,
        nome: dados.nome,
        especificacao: dados.especificacao,
        preco: dados.preco,
        fornecedor: dados.fornecedor ?? null,
        ativo: true,
        criadoEm: new Date().toISOString(),
      },
    };
  }

  async function onAtualizarMock(id: string, dados: DadosProduto): Promise<ResultadoProduto> {
    await esperar();
    const atual = PRODUTOS_MOCK.find((p) => p.id === id);
    return {
      ok: true,
      produto: {
        id,
        tipo: dados.tipo,
        nome: dados.nome,
        especificacao: dados.especificacao,
        preco: dados.preco,
        fornecedor: dados.fornecedor ?? null,
        ativo: atual?.ativo ?? true,
        criadoEm: atual?.criadoEm ?? new Date().toISOString(),
      },
    };
  }

  async function onAlternarAtivoMock(id: string, ativo: boolean): Promise<ResultadoProduto> {
    await esperar();
    const atual = PRODUTOS_MOCK.find((p) => p.id === id);
    if (!atual) return { ok: false, erro: "Produto de preview não encontrado." };
    return { ok: true, produto: { ...atual, ativo } };
  }

  return (
    <CatalogoLab
      produtosIniciais={PRODUTOS_MOCK}
      onCriar={onCriarMock}
      onAtualizar={onAtualizarMock}
      onAlternarAtivo={onAlternarAtivoMock}
    />
  );
}

/** `?erro=1` do harness — exercita o estado ERRO de carregamento (Design-
 * System.md Seção 8), mesmo padrão de `?erro=1` em `/dev/preview/perfil`. */
export function CatalogoMockErro() {
  async function onMockNaoUsado(): Promise<ResultadoProduto> {
    await esperar();
    return { ok: true };
  }

  return (
    <CatalogoLab
      produtosIniciais={[]}
      erroCarregamento
      onCriar={onMockNaoUsado}
      onAtualizar={onMockNaoUsado}
      onAlternarAtivo={onMockNaoUsado}
    />
  );
}
