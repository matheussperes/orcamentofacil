import { describe, it, expect } from "vitest";
import {
  empacotarChapas,
  planoDeCorte,
  CHAPA_LARGURA_MM,
  CHAPA_ALTURA_MM,
  type PecaPosicionada,
} from "./cutting";
import type { Peca } from "../types";

function sobrepoe(a: PecaPosicionada, b: PecaPosicionada): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function semSobreposicao(pecas: PecaPosicionada[]): boolean {
  for (let i = 0; i < pecas.length; i++) {
    for (let j = i + 1; j < pecas.length; j++) {
      if (sobrepoe(pecas[i], pecas[j])) return false;
    }
  }
  return true;
}

function dentroDaChapa(pecas: PecaPosicionada[], w: number, h: number): boolean {
  return pecas.every((p) => p.x >= 0 && p.y >= 0 && p.x + p.w <= w && p.y + p.h <= h);
}

describe("empacotarChapas — shelf-first bin packing", () => {
  it("empacota 4 peças 800×600 numa única chapa, 3 na primeira prateleira", () => {
    const entrada = Array.from({ length: 4 }, (_, i) => ({
      id: String(i),
      nome: "Painel",
      w: 800,
      h: 600,
    }));
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(0);
    expect(chapas).toHaveLength(1);
    expect(chapas[0].pecas).toHaveLength(4);
    // 3 cabem lado a lado (2400mm) na largura de 2750mm; a 4ª abre nova prateleira.
    const y0 = chapas[0].pecas.filter((p) => p.y === 0);
    expect(y0).toHaveLength(3);
    expect(semSobreposicao(chapas[0].pecas)).toBe(true);
    expect(dentroDaChapa(chapas[0].pecas, CHAPA_LARGURA_MM, CHAPA_ALTURA_MM)).toBe(true);
  });

  it("calcula o aproveitamento como área ocupada / área da chapa", () => {
    const entrada = [{ id: "1", nome: "P", w: 1000, h: 1000 }];
    const { chapas } = empacotarChapas(entrada, 2750, 1840);
    expect(chapas[0].aproveitamento).toBeCloseTo(
      (1000 * 1000) / (2750 * 1840),
      6
    );
  });

  it("gira a peça quando necessário para caber na chapa", () => {
    // 1000×2600 não cabe na orientação original (altura 2600 > 1840), mas
    // cabe girada (2600×1000, já que 2600 <= 2750 e 1000 <= 1840).
    const entrada = [{ id: "1", nome: "Rotada", w: 1000, h: 2600 }];
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(0);
    expect(chapas).toHaveLength(1);
    expect(chapas[0].pecas[0]).toMatchObject({ w: 2600, h: 1000 });
  });

  it("marca como fora-da-chapa peças maiores que a chapa em qualquer orientação", () => {
    const entrada = [{ id: "1", nome: "Gigante", w: 3000, h: 3000 }];
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(1);
    expect(chapas.every((c) => c.pecas.length === 0)).toBe(true);
  });

  it("abre uma nova chapa quando a prateleira não cabe mais na altura", () => {
    // Peças de 2750×620: 2 prateleiras cabem (1240mm) mas não uma 3ª (1860>1840).
    const entrada = Array.from({ length: 3 }, (_, i) => ({
      id: String(i),
      nome: "Full",
      w: 2750,
      h: 620,
    }));
    const { chapas } = empacotarChapas(entrada);
    expect(chapas).toHaveLength(2);
    expect(chapas[0].pecas).toHaveLength(2);
    expect(chapas[1].pecas).toHaveLength(1);
  });
});

describe("planoDeCorte — agrupamento por material", () => {
  it("agrupa peças por cor×espessura em grupos separados", () => {
    const pecas: Peca[] = [
      { nome: "Lateral", quantidade: 2, material_tipo: "caixa", cor: "Branco TX", espessura_mm: 15, altura_mm: 720, largura_mm: 550, area_m2: 0, fita_m: 0 },
      { nome: "Porta", quantidade: 2, material_tipo: "frente", cor: "Louro Freijó", espessura_mm: 18, altura_mm: 700, largura_mm: 400, area_m2: 0, fita_m: 0 },
    ];
    const grupos = planoDeCorte(pecas);
    expect(grupos).toHaveLength(2);
    const brancoTx = grupos.find((g) => g.cor === "Branco TX")!;
    expect(brancoTx.espessura_mm).toBe(15);
    expect(brancoTx.chapas.reduce((s, c) => s + c.pecas.length, 0)).toBe(2);
  });

  it("expande a quantidade em peças individuais", () => {
    const pecas: Peca[] = [
      { nome: "Prateleira", quantidade: 5, material_tipo: "prateleira", cor: "Branco TX", espessura_mm: 15, altura_mm: 300, largura_mm: 400, area_m2: 0, fita_m: 0 },
    ];
    const [grupo] = planoDeCorte(pecas);
    const total = grupo.chapas.reduce((s, c) => s + c.pecas.length, 0);
    expect(total).toBe(5);
  });
});
