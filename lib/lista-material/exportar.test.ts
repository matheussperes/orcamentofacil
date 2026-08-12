import { describe, expect, it } from "vitest";
import { gerarCsvListaMaterial, gerarTextoListaMaterial } from "./exportar";
import type { SnapshotListaMaterial } from "./tipos";
import { formatarMoeda } from "@/lib/format";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — D-08, extração
// texto/CSV. Só cobre os geradores puros (sem DOM) — `baixarArquivo` toca
// `document`/Blob e não tem valor de teste isolado (efeito colateral puro).

function snapshotBase(overrides: Partial<SnapshotListaMaterial> = {}): SnapshotListaMaterial {
  return {
    versao: 1,
    geradoEm: "2026-07-30T12:00:00.000Z",
    orcamentoId: "orc-1",
    linhas: [{ item: "MDF Branco TX 15mm", categoria: "Chapas", qtd: "1 chapa(s) · 0.50 m²", quantidadeBase: 1, unit: 285, total: 285 }],
    itensManuais: [{ id: "m1", descricao: "Instalação especial", quantidade: 2, valorUnitario: 50 }],
    subtotalMaterial: 285,
    subtotalManual: 100,
    total: 385,
    frete: 120,
    planoDeCorte: [
      { cor: "Branco TX", espessuraMm: 15, chapas: 1, areaConsumidaM2: 0.5, pecasForaDaChapa: [] },
    ],
    ...overrides,
  };
}

describe("gerarTextoListaMaterial", () => {
  it("inclui plano de corte, linhas do BOM, itens manuais e totais", () => {
    const texto = gerarTextoListaMaterial(snapshotBase());
    expect(texto).toContain("MDF Branco TX 15mm");
    expect(texto).toContain("Instalação especial");
    expect(texto).toContain(`Total do pré-pedido: ${formatarMoeda(385)}`);
    expect(texto).toContain("Frete (informativo");
  });

  it("estado vazio -> mensagem explícita em vez de listas em branco", () => {
    const texto = gerarTextoListaMaterial(
      snapshotBase({ linhas: [], itensManuais: [], planoDeCorte: [], subtotalMaterial: 0, subtotalManual: 0, total: 0, frete: null })
    );
    expect(texto).toContain("Nenhuma peça no plano de corte.");
    expect(texto).toContain("Nenhum item.");
    expect(texto).not.toContain("Frete");
  });

  it("peças fora da chapa aparecem como aviso dentro do grupo", () => {
    const texto = gerarTextoListaMaterial(
      snapshotBase({
        planoDeCorte: [
          { cor: "Branco TX", espessuraMm: 15, chapas: 1, areaConsumidaM2: 0.5, pecasForaDaChapa: ["Painel gigante"] },
        ],
      })
    );
    expect(texto).toContain("Fora da chapa: Painel gigante");
  });
});

describe("gerarCsvListaMaterial", () => {
  it("gera cabeçalho + linhas + totais separados por ;", () => {
    const csv = gerarCsvListaMaterial(snapshotBase());
    const linhas = csv.split("\r\n");
    expect(linhas[0]).toBe("Categoria;Item;Quantidade;Valor unitário;Total");
    expect(linhas).toContainEqual("Chapas;MDF Branco TX 15mm;1 chapa(s) · 0.50 m²;285.00;285.00");
    expect(linhas).toContainEqual("Serviço;Instalação especial;2;50.00;100.00");
    expect(linhas.at(-1)).toBe(";Frete (informativo);;;120.00");
  });

  it("escapa campo com ; entre aspas duplas", () => {
    const csv = gerarCsvListaMaterial(
      snapshotBase({
        itensManuais: [{ id: "m1", descricao: "Corte; ajuste especial", quantidade: 1, valorUnitario: 10 }],
      })
    );
    expect(csv).toContain('"Corte; ajuste especial"');
  });
});
