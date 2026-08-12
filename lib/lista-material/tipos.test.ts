import { describe, expect, it } from "vitest";
import { montarSnapshotListaMaterial } from "./tipos";
import type { GrupoChapas } from "@/lib/engine/box/cutting";
import type { LinhaInsumo } from "@/lib/insumos";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md).

function grupo(overrides: Partial<GrupoChapas> = {}): GrupoChapas {
  return {
    cor: "Branco TX",
    espessura_mm: 15,
    larguraChapa: 2750,
    alturaChapa: 1840,
    chapas: [
      {
        index: 1,
        aproveitamento: 0.5,
        numCortes: 0,
        pecas: [{ id: "0-0", nome: "Lateral", w: 1000, h: 500, temVeio: false, x: 0, y: 0 }],
      },
    ],
    pecasForaDaChapa: [],
    ...overrides,
  };
}

describe("montarSnapshotListaMaterial", () => {
  it("soma subtotal material + subtotal manual no total, sem misturar frete", () => {
    const linhas: LinhaInsumo[] = [
      { item: "MDF Branco TX 15mm", categoria: "Chapas", qtd: "1 chapa(s)", quantidadeBase: 1, unit: 285, total: 285 },
    ];
    const snapshot = montarSnapshotListaMaterial({
      orcamentoId: "orc-1",
      linhas,
      subtotalMaterial: 285,
      itensManuais: [{ id: "m1", descricao: "Instalação especial", quantidade: 2, valorUnitario: 50 }],
      frete: 120,
      grupos: [],
    });

    expect(snapshot.subtotalMaterial).toBe(285);
    expect(snapshot.subtotalManual).toBe(100);
    expect(snapshot.total).toBe(385);
    expect(snapshot.frete).toBe(120);
    expect(snapshot.versao).toBe(1);
  });

  it("resume o plano de corte por grupo (chapas, m² consumido, peças fora da chapa)", () => {
    const g = grupo({
      pecasForaDaChapa: [{ id: "x", nome: "Painel gigante", w: 3000, h: 2000, temVeio: false }],
    });
    const snapshot = montarSnapshotListaMaterial({
      orcamentoId: "orc-1",
      linhas: [],
      subtotalMaterial: 0,
      itensManuais: [],
      frete: null,
      grupos: [g],
    });

    expect(snapshot.planoDeCorte).toEqual([
      {
        cor: "Branco TX",
        espessuraMm: 15,
        chapas: 1,
        areaConsumidaM2: 0.5, // 1000mm × 500mm = 0.5 m²
        pecasForaDaChapa: ["Painel gigante"],
      },
    ]);
    expect(snapshot.frete).toBeNull();
  });

  it("sem itens manuais -> subtotalManual 0", () => {
    const snapshot = montarSnapshotListaMaterial({
      orcamentoId: "orc-1",
      linhas: [],
      subtotalMaterial: 0,
      itensManuais: [],
      frete: null,
      grupos: [],
    });
    expect(snapshot.subtotalManual).toBe(0);
    expect(snapshot.total).toBe(0);
  });
});
