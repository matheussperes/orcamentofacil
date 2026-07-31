import { describe, expect, it } from "vitest";
import { produtosParaCatalogo, produtosParaCatalogoComFallback } from "./mapear";
import { CATALOGO_PADRAO, catalogoParaPrecos } from "@/lib/catalog";
import { PRECOS_REFERENCIA } from "@/lib/engine/prices";
import type { ProdutoRow } from "./tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md).

function produto(overrides: Partial<ProdutoRow> = {}): ProdutoRow {
  return {
    id: "p1",
    tipo: "chapa",
    nome: "Branco TX 15mm",
    especificacao: { cor: "Branco TX", espessura: 15 },
    preco: 285,
    fornecedor: null,
    ativo: true,
    criadoEm: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("produtosParaCatalogo", () => {
  it("mapeia chapa -> Catalogo.mdf (cor/espessura/preço)", () => {
    const catalogo = produtosParaCatalogo([produto()]);
    expect(catalogo.mdf).toEqual([
      { id: "p1", cor: "Branco TX", espessura: 15, precoChapa: 285, fornecedor: undefined },
    ]);
  });

  it("mapeia ferragem -> Catalogo.ferragens, com nome amigável quando o nome do produto está vazio", () => {
    const catalogo = produtosParaCatalogo([
      produto({
        id: "f1",
        tipo: "ferragem",
        nome: "",
        especificacao: { codigo: "dobradica_35", unidade: "un" },
        preco: 8,
      }),
    ]);
    expect(catalogo.ferragens).toEqual([
      { codigo: "dobradica_35", nome: "Dobradiça 35mm", unidade: "un", preco: 8, fornecedor: undefined },
    ]);
  });

  it("preserva o nome customizado do produto de ferragem quando informado", () => {
    const catalogo = produtosParaCatalogo([
      produto({
        tipo: "ferragem",
        nome: "Dobradiça reforçada",
        especificacao: { codigo: "dobradica_35", unidade: "un" },
        preco: 12,
      }),
    ]);
    expect(catalogo.ferragens[0].nome).toBe("Dobradiça reforçada");
  });

  it("ferragem sem código não entra no catálogo (produto 'morto', não afeta cálculo)", () => {
    const catalogo = produtosParaCatalogo([
      produto({ tipo: "ferragem", especificacao: { codigo: "", unidade: "un" } }),
    ]);
    expect(catalogo.ferragens).toEqual([]);
  });

  it("chapa sem cor/espessura válida não entra no catálogo", () => {
    const catalogo = produtosParaCatalogo([
      produto({ especificacao: { cor: "", espessura: 0 } }),
    ]);
    expect(catalogo.mdf).toEqual([]);
  });

  it("ignora produtos inativos", () => {
    const catalogo = produtosParaCatalogo([produto({ ativo: false })]);
    expect(catalogo.mdf).toEqual([]);
  });

  it("tipo fita: usa o preço do produto ativo mais antigo (criado_em) quando há mais de um", () => {
    const catalogo = produtosParaCatalogo([
      produto({ id: "fita-novo", tipo: "fita", especificacao: { unidade: "m" }, preco: 3.5, criadoEm: "2026-02-01T00:00:00.000Z" }),
      produto({ id: "fita-antigo", tipo: "fita", especificacao: { unidade: "m" }, preco: 2.5, criadoEm: "2026-01-01T00:00:00.000Z" }),
    ]);
    expect(catalogo.fitaMetro).toBe(2.5);
  });

  it("sem produto tipo fita ativo -> cai no fitaMetro de PRECOS_REFERENCIA", () => {
    const catalogo = produtosParaCatalogo([]);
    expect(catalogo.fitaMetro).toBe(PRECOS_REFERENCIA.fitaMetro);
  });

  it("led/acessorio não afetam o Catalogo (sem campo correspondente)", () => {
    const catalogo = produtosParaCatalogo([
      produto({ id: "led1", tipo: "led", especificacao: {}, preco: 40 }),
      produto({ id: "ac1", tipo: "acessorio", especificacao: {}, preco: 15 }),
    ]);
    expect(catalogo.mdf).toEqual([]);
    expect(catalogo.ferragens).toEqual([]);
  });

  it("montagemPorM2/freteFixo vêm sempre de PRECOS_REFERENCIA, nunca de produto", () => {
    const catalogo = produtosParaCatalogo([produto()]);
    expect(catalogo.montagemPorM2).toBe(PRECOS_REFERENCIA.montagemPorM2);
    expect(catalogo.freteFixo).toBe(PRECOS_REFERENCIA.freteFixo);
  });

  it("catalogoParaPrecos (já existente) continua consumindo o resultado sem alteração", () => {
    const catalogo = produtosParaCatalogo([
      produto(),
      produto({ id: "f1", tipo: "ferragem", especificacao: { codigo: "puxador", unidade: "un" }, preco: 15 }),
    ]);
    const precos = catalogoParaPrecos(catalogo);
    expect(precos.chapaEspecifica).toEqual([{ cor: "Branco TX", espessura: 15, preco: 285 }]);
    expect(precos.ferragens.puxador).toBe(15);
  });
});

describe("produtosParaCatalogoComFallback", () => {
  it("cai no CATALOGO_PADRAO quando não há chapa nem ferragem ativa (lista vazia)", () => {
    expect(produtosParaCatalogoComFallback([])).toEqual(CATALOGO_PADRAO);
  });

  it("cai no CATALOGO_PADRAO quando só há led/acessorio (sem chapa/ferragem)", () => {
    const catalogo = produtosParaCatalogoComFallback([
      produto({ tipo: "led", especificacao: {}, preco: 40 }),
    ]);
    expect(catalogo).toEqual(CATALOGO_PADRAO);
  });

  it("não usa o fallback quando há ao menos uma chapa ativa", () => {
    const catalogo = produtosParaCatalogoComFallback([produto()]);
    expect(catalogo).not.toEqual(CATALOGO_PADRAO);
    expect(catalogo.mdf).toHaveLength(1);
  });
});
