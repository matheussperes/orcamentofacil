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
      temVeio: false,
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
    const entrada = [{ id: "1", nome: "P", w: 1000, h: 1000, temVeio: false }];
    const { chapas } = empacotarChapas(entrada, 2750, 1840);
    expect(chapas[0].aproveitamento).toBeCloseTo(
      (1000 * 1000) / (2750 * 1840),
      6
    );
  });

  it("gira a peça quando necessário para caber na chapa", () => {
    // 1000×2600 não cabe na orientação original (altura 2600 > 1840), mas
    // cabe girada (2600×1000, já que 2600 <= 2750 e 1000 <= 1840).
    const entrada = [{ id: "1", nome: "Rotada", w: 1000, h: 2600, temVeio: false }];
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(0);
    expect(chapas).toHaveLength(1);
    expect(chapas[0].pecas[0]).toMatchObject({ w: 2600, h: 1000 });
  });

  it("marca como fora-da-chapa peças maiores que a chapa em qualquer orientação", () => {
    const entrada = [{ id: "1", nome: "Gigante", w: 3000, h: 3000, temVeio: false }];
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
      temVeio: false,
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
      { nome: "Lateral", quantidade: 2, material_tipo: "caixa", cor: "Branco TX", espessura_mm: 15, altura_mm: 720, largura_mm: 550, area_m2: 0, fita_m: 0, temVeio: false, sentidoVeio: "comprimento" },
      { nome: "Porta", quantidade: 2, material_tipo: "frente", cor: "Louro Freijó", espessura_mm: 18, altura_mm: 700, largura_mm: 400, area_m2: 0, fita_m: 0, temVeio: false, sentidoVeio: "comprimento" },
    ];
    const grupos = planoDeCorte(pecas);
    expect(grupos).toHaveLength(2);
    const brancoTx = grupos.find((g) => g.cor === "Branco TX")!;
    expect(brancoTx.espessura_mm).toBe(15);
    expect(brancoTx.chapas.reduce((s, c) => s + c.pecas.length, 0)).toBe(2);
  });

  it("expande a quantidade em peças individuais", () => {
    const pecas: Peca[] = [
      { nome: "Prateleira", quantidade: 5, material_tipo: "prateleira", cor: "Branco TX", espessura_mm: 15, altura_mm: 300, largura_mm: 400, area_m2: 0, fita_m: 0, temVeio: false, sentidoVeio: "comprimento" },
    ];
    const [grupo] = planoDeCorte(pecas);
    const total = grupo.chapas.reduce((s, c) => s + c.pecas.length, 0);
    expect(total).toBe(5);
  });
});

describe("empacotarChapas — veio de chapa (Seção 8, Task 12.5)", () => {
  it("peça com veio que cabe só numa orientação é posicionada nela, mesmo quando a rotacionada também caberia", () => {
    // 1500×800: cabe como está (1500<=2750, 800<=1840) E também rotacionada
    // (800<=2750, 1500<=1840) — ambas orientações são válidas na chapa.
    // Com temVeio: true, a rotação está desabilitada: o resultado tem que
    // sair EXATAMENTE como entrou, provando que não foi a "sorte" de só uma
    // orientação caber.
    const entrada = [{ id: "1", nome: "Com veio", w: 1500, h: 800, temVeio: true }];
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(0);
    expect(chapas[0].pecas[0]).toMatchObject({ w: 1500, h: 800 });
  });

  it("peça com veio cuja única orientação fixa NÃO cabe vai pra foraDaChapa, nunca é forçada rotacionada", () => {
    // Mesmas dimensões do teste "gira a peça quando necessário" (não-veio):
    // 1000×2600 não cabe como está (2600 > alturaChapa=1840), mas cabe
    // rotacionada (2600×1000). Sem veio isso rotacionaria e caberia — com
    // veio a rotação está desabilitada, então tem que ir pra foraDaChapa.
    const entrada = [{ id: "1", nome: "Com veio", w: 1000, h: 2600, temVeio: true }];
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(1);
    expect(foraDaChapa[0]).toMatchObject({ w: 1000, h: 2600 }); // não rotacionada
    expect(chapas.every((c) => c.pecas.length === 0)).toBe(true);
  });

  it("peça sem veio continua girando livremente quando necessário (não-regressão)", () => {
    const entrada = [{ id: "1", nome: "Sem veio", w: 1000, h: 2600, temVeio: false }];
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(0);
    expect(chapas[0].pecas[0]).toMatchObject({ w: 2600, h: 1000 });
  });

  it("mix de peças com/sem veio no mesmo lote: cada uma segue sua própria regra", () => {
    const entrada = [
      { id: "veio", nome: "Com veio", w: 1000, h: 2600, temVeio: true }, // não cabe fixa → fora
      { id: "sem-veio", nome: "Sem veio", w: 1000, h: 2600, temVeio: false }, // gira e cabe
    ];
    const { chapas, foraDaChapa } = empacotarChapas(entrada);
    expect(foraDaChapa).toHaveLength(1);
    expect(foraDaChapa[0].id).toBe("veio");
    const todas = chapas.flatMap((c) => c.pecas);
    expect(todas).toHaveLength(1);
    expect(todas[0].id).toBe("sem-veio");
    expect(todas[0]).toMatchObject({ w: 2600, h: 1000 });
  });
});

describe("planoDeCorte — veio de chapa: mix no mesmo grupo cor×espessura (Seção 8)", () => {
  it("cada peça (com/sem veio) segue sua própria regra dentro do mesmo grupo", () => {
    const pecas: Peca[] = [
      // Com veio, sentidoVeio "largura": expandirPecas inverte pra
      // w=altura_mm(2600), h=largura_mm(1000) — cabe na orientação fixa sem
      // precisar girar, então permanece.
      {
        nome: "Lateral com veio",
        quantidade: 1,
        material_tipo: "caixa",
        cor: "Branco TX",
        espessura_mm: 15,
        altura_mm: 2600,
        largura_mm: 1000,
        area_m2: 0,
        fita_m: 0,
        temVeio: true,
        sentidoVeio: "largura",
      },
      // Sem veio: entra como w=largura_mm(1000), h=altura_mm(2600) — não
      // cabe assim (2600 > 1840), mas gira livremente e cabe (2600×1000).
      {
        nome: "Lateral sem veio",
        quantidade: 1,
        material_tipo: "caixa",
        cor: "Branco TX",
        espessura_mm: 15,
        altura_mm: 2600,
        largura_mm: 1000,
        area_m2: 0,
        fita_m: 0,
        temVeio: false,
        sentidoVeio: "comprimento",
      },
    ];
    const [grupo] = planoDeCorte(pecas);
    expect(grupo.pecasForaDaChapa).toHaveLength(0);
    const todas = grupo.chapas.flatMap((c) => c.pecas);
    expect(todas).toHaveLength(2);
    // Ambas terminam 2600×1000 (a com-veio já nasce assim de expandirPecas;
    // a sem-veio chega como 1000×2600 e é girada por empacotarChapas).
    expect(todas.every((p) => p.w === 2600 && p.h === 1000)).toBe(true);
  });
});
