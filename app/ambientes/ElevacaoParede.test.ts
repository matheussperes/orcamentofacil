// Task 13.2a — testes puros da geometria da elevação da parede (régua +
// faixas + elementos). Mesmo espírito de BoxCanvas.test.ts: sem jsdom no
// ambiente de teste, então só a matemática pura (`layoutElevacao`,
// `bandasFaixas`, `retanguloParaPx`) é exercitada aqui — o SVG em si é
// verificado visualmente no browser (breakpoints 375/768/1440px).
import { describe, expect, it } from "vitest";
import { bandasFaixas, layoutElevacao, retanguloParaPx } from "./ElevacaoParede";
import type { AlturasFaixas } from "@/lib/engine/parede";

const alturas: AlturasFaixas = {
  alturaRodape: 100,
  alturaBancada: 900,
  alturaInstalacaoAereo: 1400,
  peDireito: 2700,
};

describe("bandasFaixas", () => {
  it("produz 3 bandas empilhadas (inferior/bancada/aereo) com os limites configurados", () => {
    const bandas = bandasFaixas(alturas);

    expect(bandas).toEqual([
      { faixa: "inferior", y0: 0, y1: 900 },
      { faixa: "bancada", y0: 900, y1: 1400 },
      { faixa: "aereo", y0: 1400, y1: 2700 },
    ]);
  });

  it("não inclui 'torre' como banda — ocupa do chão ao pé-direito por natureza (ver comentário no código)", () => {
    const bandas = bandasFaixas(alturas);
    expect(bandas.some((b) => b.faixa === "torre")).toBe(false);
  });
});

describe("layoutElevacao", () => {
  it("escala limitada pela largura quando a parede é proporcionalmente mais larga que a caixa disponível", () => {
    // parede 4000x2700 numa área 480x360: largura manda (480/4000=0.12 < 360/2700=0.133)
    const layout = layoutElevacao({ largura: 4000, altura: 2700 }, alturas, 480, 360);
    expect(layout.scale).toBeCloseTo(480 / 4000, 10);
    expect(layout.larguraPx).toBeCloseTo(480, 6);
    expect(layout.alturaPx).toBeCloseTo(2700 * (480 / 4000), 6);
  });

  it("escala limitada pela altura quando a parede é proporcionalmente mais alta", () => {
    // parede 2000x3000 numa área 480x360: altura manda (360/3000=0.12 < 480/2000=0.24)
    const layout = layoutElevacao({ largura: 2000, altura: 3000 }, alturas, 480, 360);
    expect(layout.scale).toBeCloseTo(360 / 3000, 10);
    expect(layout.alturaPx).toBeCloseTo(360, 6);
  });

  it("devolve escala 0 para largura/altura zero ou negativa (evita Infinity/NaN)", () => {
    expect(layoutElevacao({ largura: 0, altura: 2700 }, alturas, 480, 360).scale).toBe(0);
    expect(layoutElevacao({ largura: 3000, altura: -1 }, alturas, 480, 360).scale).toBe(0);
  });

  it("carrega as bandas de faixa calculadas a partir das alturas informadas", () => {
    const layout = layoutElevacao({ largura: 3000, altura: 2700 }, alturas, 480, 360);
    expect(layout.bandas).toHaveLength(3);
    expect(layout.bandas[0]).toEqual({ faixa: "inferior", y0: 0, y1: 900 });
  });
});

describe("retanguloParaPx", () => {
  const layout = layoutElevacao({ largura: 2000, altura: 1000 }, alturas, 400, 200);
  // scale = min(400/2000, 200/1000) = 0.2; alturaPx = 200

  it("converte x em mm pra px multiplicando pela escala (x cresce igual nos dois referenciais)", () => {
    const r = retanguloParaPx(500, 0, 100, 100, layout);
    expect(r.x).toBeCloseTo(500 * 0.2, 6);
    expect(r.w).toBeCloseTo(100 * 0.2, 6);
  });

  it("inverte o eixo Y: um elemento no chão (y=0) fica encostado na base da área (y + h = alturaPx)", () => {
    const r = retanguloParaPx(0, 0, 100, 100, layout);
    expect(r.y + r.h).toBeCloseTo(layout.alturaPx, 6);
  });

  it("um elemento no topo (y+altura = altura da parede) fica encostado no topo da área (y=0)", () => {
    const r = retanguloParaPx(0, 900, 100, 100, layout); // 900+100=1000=altura da parede
    expect(r.y).toBeCloseTo(0, 6);
  });

  it("altura em px é a altura em mm multiplicada pela escala", () => {
    const r = retanguloParaPx(0, 200, 50, 300, layout);
    expect(r.h).toBeCloseTo(300 * 0.2, 6);
  });
});
