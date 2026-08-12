import { describe, it, expect } from "vitest";
import {
  derivarDimensoesTampo,
  derivarDimensoesRodape,
  derivarDimensoesFechamento,
  derivarDimensoesTamponamento,
  explodeElementoContinuo,
  validarPosicao,
  validarEspessuraTampo,
  validarConfigTampo,
  espessuraFinalDoConfigTampo,
  trocarModeloTampo,
} from "./explode";
import { modeloDoTampo } from "./types";
import { larguraFitaMm } from "../consolidar";
import type { ConfigTampo, ElementoContinuo, ModuloResolvido, SelecaoTampo } from "./types";

const MATERIAL = { cor: "Branco TX", espessura: 15 };

function elemento(overrides: Partial<ElementoContinuo> = {}): ElementoContinuo {
  return {
    id: "ec-1",
    tipo: "tampo",
    alvo: { conjuntoId: "c1" },
    posicao: "superior",
    material: MATERIAL,
    ...overrides,
  };
}

const modulo = (largura: number, profundidade: number, altura = 720): ModuloResolvido => ({
  largura,
  profundidade,
  altura,
});

describe("Tampo — derivação de dimensão (Seção 3.4)", () => {
  it("sobre um Conjunto de 2 módulos de larguras diferentes: largura = soma; profundidade = maior + 30mm", () => {
    const itens = [modulo(600, 500), modulo(900, 560)];
    const el = elemento({ tipo: "tampo", posicao: "superior" });
    const dim = derivarDimensoesTampo(itens, el);
    expect(dim.largura).toBe(1500);
    expect(dim.profundidade).toBe(590); // 560 + 30
  });

  it("override sobrescreve largura/profundidade quando presente", () => {
    const itens = [modulo(600, 500)];
    const el = elemento({ tipo: "tampo", posicao: "superior", override: { largura: 1234, profundidade: 999 } });
    const dim = derivarDimensoesTampo(itens, el);
    expect(dim).toEqual({ largura: 1234, profundidade: 999 });
  });

  it("engrossado nível 2 (engrossada, lado único) — reaproveita explodePlaca (Task 12.1), mesma peça-base + sarrafos", () => {
    const itens = [modulo(800, 500)];
    const el = elemento({
      tipo: "tampo",
      posicao: "superior",
      engrossamento: { tecnica: "engrossada", nivel: 2, lados: ["superior"] },
    });
    const r = explodeElementoContinuo(el, { itens });
    // largura = 800, profundidade = 530 (500+30)
    const base = r.pecas.find((p) => p.nome === "Placa (base, engrossada)");
    expect(base).toBeTruthy();
    expect(base?.largura_mm).toBe(800);
    expect(base?.altura_mm).toBe(530);
    const sarrafo = r.pecas.find((p) => p.nome === "Sarrafo engrossamento (superior)");
    expect(sarrafo).toBeTruthy();
    expect(sarrafo?.quantidade).toBe(2); // nível 2 = 2 camadas
    // eixo maior é a largura (800 > 530) — sarrafo do lado "superior" corre a
    // largura inteira. `push` de placa/explode.ts usa (altura=comprimento,
    // largura=larguraSarrafo) — aqui altura_mm carrega o comprimento (800).
    expect(sarrafo?.altura_mm).toBe(800);
    expect(sarrafo?.largura_mm).toBe(70); // SARRAFO_LARGURA_PADRAO (default)
  });
});

describe("Rodapé — derivação de dimensão (Seção 3.4)", () => {
  it("valores default: largura total -30mm, profundidade do módulo -130mm, altura 150mm", () => {
    const itens = [modulo(1000, 550)];
    const el = elemento({ tipo: "rodape", posicao: "base" });
    const dim = derivarDimensoesRodape(itens, el);
    expect(dim).toEqual({ largura: 970, profundidade: 420, altura: 150 });
  });

  it("override sobrescreve a altura, mantendo largura/profundidade derivadas", () => {
    const itens = [modulo(1000, 550)];
    const el = elemento({ tipo: "rodape", posicao: "base", override: { altura: 100 } });
    const dim = derivarDimensoesRodape(itens, el);
    expect(dim).toEqual({ largura: 970, profundidade: 420, altura: 100 });
  });

  it("explosão gera 1 peça altura x largura (profundidade não é dimensão de corte, ver A-07)", () => {
    const itens = [modulo(1000, 550)];
    const el = elemento({ tipo: "rodape", posicao: "base" });
    const r = explodeElementoContinuo(el, { itens });
    expect(r.pecas).toHaveLength(1);
    expect(r.pecas[0]).toMatchObject({ nome: "Rodapé", altura_mm: 150, largura_mm: 970 });
  });
});

describe("Fechamento — derivação de dimensão (Seção 3.4)", () => {
  it("posição superior: sarrafo na largura total do bloco", () => {
    const itens = [modulo(600, 500, 700), modulo(900, 500, 720)];
    const el = elemento({ tipo: "fechamento", posicao: "superior" });
    const dim = derivarDimensoesFechamento(itens, el);
    expect(dim).toEqual({ comprimento: 1500, larguraSarrafo: 50 });
  });

  it("posição esquerda: sarrafo na altura total (maior altura do bloco)", () => {
    const itens = [modulo(600, 500, 700), modulo(900, 500, 720)];
    const el = elemento({ tipo: "fechamento", posicao: "esquerda" });
    const dim = derivarDimensoesFechamento(itens, el);
    expect(dim).toEqual({ comprimento: 720, larguraSarrafo: 50 });
  });

  it("explosão gera 1 peça sarrafo (comprimento x larguraSarrafo)", () => {
    const itens = [modulo(600, 500, 700)];
    const el = elemento({ tipo: "fechamento", posicao: "superior" });
    const r = explodeElementoContinuo(el, { itens });
    expect(r.pecas).toEqual([
      expect.objectContaining({ nome: "Fechamento", altura_mm: 600, largura_mm: 50 }),
    ]);
  });
});

describe("Tamponamento — deriva do módulo da extremidade (Seção 3.5)", () => {
  it("tipo inteiro, posição esquerda: profundidade = módulo + 25mm; altura = altura do módulo", () => {
    const moduloExtremidade = modulo(700, 500, 720);
    const el = elemento({ tipo: "tamponamento", posicao: "esquerda", tamponamentoTipo: "inteiro" });
    const dim = derivarDimensoesTamponamento(moduloExtremidade, el);
    expect(dim).toEqual({ altura: 720, profundidade: 525 });
  });

  it("override é IGNORADO por completo — dimensões continuam estritamente derivadas", () => {
    const moduloExtremidade = modulo(700, 500, 720);
    const el = elemento({
      tipo: "tamponamento",
      posicao: "esquerda",
      tamponamentoTipo: "inteiro",
      override: { altura: 9999, profundidade: 9999, largura: 9999 },
    });
    const dim = derivarDimensoesTamponamento(moduloExtremidade, el);
    expect(dim).toEqual({ altura: 720, profundidade: 525 });
  });

  it("tipo sarrafo: profundidade fixa 70mm, independente da profundidade do módulo", () => {
    const moduloExtremidade = modulo(700, 999, 720); // profundidade bem diferente de 70
    const el = elemento({ tipo: "tamponamento", posicao: "direita", tamponamentoTipo: "sarrafo" });
    const dim = derivarDimensoesTamponamento(moduloExtremidade, el);
    expect(dim.profundidade).toBe(70);
    expect(dim.altura).toBe(720);
  });

  it("posição base: a dimensão que seria a altura do módulo agora é a largura do módulo (mudança de eixo)", () => {
    const moduloExtremidade = modulo(700, 500, 720);
    const el = elemento({ tipo: "tamponamento", posicao: "base", tamponamentoTipo: "inteiro" });
    const dim = derivarDimensoesTamponamento(moduloExtremidade, el);
    expect(dim.altura).toBe(700); // largura do módulo, não a altura (720)
    expect(dim.profundidade).toBe(525);
  });

  it("explosão gera 1 peça (altura x profundidade derivadas)", () => {
    const moduloExtremidade = modulo(700, 500, 720);
    const el = elemento({ tipo: "tamponamento", posicao: "esquerda", tamponamentoTipo: "inteiro" });
    const r = explodeElementoContinuo(el, { moduloExtremidade });
    expect(r.pecas).toHaveLength(1);
    expect(r.pecas[0]).toMatchObject({ altura_mm: 720, largura_mm: 525 });
  });
});

describe("Tampo — modelo é derivado de engrossamento, nunca diverge (Seção 3.4.1)", () => {
  it("engrossamento ausente ⟺ modelo simples", () => {
    expect(modeloDoTampo(undefined)).toBe("simples");
  });
  it('engrossamento.tecnica "engrossada" ⟺ modelo engrossado', () => {
    expect(modeloDoTampo({ tecnica: "engrossada", nivel: 1, lados: ["superior"] })).toBe("engrossado");
  });
  it('engrossamento.tecnica "dobrada" ⟺ modelo dobrado', () => {
    expect(modeloDoTampo({ tecnica: "dobrada", nivel: 1 })).toBe("dobrado");
  });
});

describe("Tampo — validação de espessura por modelo (Seção 3.4.1)", () => {
  it("modelo simples aceita 15/18/25mm", () => {
    expect(validarEspessuraTampo("simples", 15)).toEqual({ ok: true });
    expect(validarEspessuraTampo("simples", 18)).toEqual({ ok: true });
    expect(validarEspessuraTampo("simples", 25)).toEqual({ ok: true });
  });
  it("engrossado/dobrado base 15 aceita 30/45/60mm; base 18 aceita 36/54mm", () => {
    expect(validarEspessuraTampo("engrossado", 30)).toEqual({ ok: true });
    expect(validarEspessuraTampo("engrossado", 45)).toEqual({ ok: true });
    expect(validarEspessuraTampo("engrossado", 60)).toEqual({ ok: true });
    expect(validarEspessuraTampo("dobrado", 36)).toEqual({ ok: true });
    expect(validarEspessuraTampo("dobrado", 54)).toEqual({ ok: true });
  });

  it("exemplo de rejeição 1 — modelo simples + espessura 30 → ESPESSURA_INVALIDA_PARA_MODELO", () => {
    const r = validarEspessuraTampo("simples", 30);
    expect(r).toEqual({ ok: false, codigo: "ESPESSURA_INVALIDA_PARA_MODELO", mensagem: expect.any(String) });
  });
  it("exemplo de rejeição 2 — modelo engrossado + espessura 25 → ESPESSURA_INVALIDA_PARA_MODELO", () => {
    const r = validarEspessuraTampo("engrossado", 25);
    expect(r).toEqual({ ok: false, codigo: "ESPESSURA_INVALIDA_PARA_MODELO", mensagem: expect.any(String) });
  });
  it("exemplo de rejeição 3 — qualquer modelo + espessura 6 → ESPESSURA_6MM_EM_TAMPO", () => {
    expect(validarEspessuraTampo("simples", 6)).toEqual({
      ok: false,
      codigo: "ESPESSURA_6MM_EM_TAMPO",
      mensagem: expect.any(String),
    });
    expect(validarEspessuraTampo("engrossado", 6)).toEqual({
      ok: false,
      codigo: "ESPESSURA_6MM_EM_TAMPO",
      mensagem: expect.any(String),
    });
    expect(validarEspessuraTampo("dobrado", 6)).toEqual({
      ok: false,
      codigo: "ESPESSURA_6MM_EM_TAMPO",
      mensagem: expect.any(String),
    });
  });

  it("espessuraFinalDoConfigTampo: simples usa a espessura direta; engrossado/dobrado usam base×(1+nível)", () => {
    const simples: ConfigTampo = { modelo: "simples", espessura: 25 };
    const engrossado: ConfigTampo = { modelo: "engrossado", espessuraBase: 15, nivel: 1, lados: ["superior"] };
    const dobrado: ConfigTampo = { modelo: "dobrado", espessuraBase: 18, nivel: 2 };
    expect(espessuraFinalDoConfigTampo(simples)).toBe(25);
    expect(espessuraFinalDoConfigTampo(engrossado)).toBe(30);
    expect(espessuraFinalDoConfigTampo(dobrado)).toBe(54);
  });

  it("validarConfigTampo deriva a espessura final e reusa a mesma tabela", () => {
    const config: ConfigTampo = { modelo: "engrossado", espessuraBase: 15, nivel: 3, lados: [] }; // 60mm, válido
    expect(validarConfigTampo(config)).toEqual({ ok: true });
    const configInvalido: ConfigTampo = { modelo: "dobrado", espessuraBase: 18, nivel: 3 }; // 72mm, fora da tabela
    expect(validarConfigTampo(configInvalido)).toMatchObject({ ok: false, codigo: "ESPESSURA_INVALIDA_PARA_MODELO" });
  });
});

describe("Tampo — trocar modelo com espessura já escolhida (Seção 3.4.1, regra 4)", () => {
  it("modelo não muda (mesmo modelo escolhido de novo): espessura já válida é preservada", () => {
    const atual: SelecaoTampo = { modelo: "simples", espessuraFinal: 18 };
    const resultado = trocarModeloTampo(atual, "simples");
    expect(resultado).toEqual({ modelo: "simples", espessuraFinal: 18 });
  });

  it("espessura incompatível com o modelo novo é LIMPA (undefined) — nunca coagida pro valor mais próximo", () => {
    const atual: SelecaoTampo = { modelo: "engrossado", espessuraFinal: 30 };
    const resultado = trocarModeloTampo(atual, "simples");
    expect(resultado).toEqual({ modelo: "simples", espessuraFinal: undefined });
  });

  it("engrossado (30mm) → dobrado preserva 30mm (mesma tabela de espessuras)", () => {
    const atual: SelecaoTampo = { modelo: "engrossado", espessuraFinal: 30 };
    const resultado = trocarModeloTampo(atual, "dobrado");
    expect(resultado).toEqual({ modelo: "dobrado", espessuraFinal: 30 });
  });

  it("sem espessura ainda escolhida, trocar modelo só troca o modelo (nada pra limpar)", () => {
    const atual: SelecaoTampo = { modelo: "simples" };
    const resultado = trocarModeloTampo(atual, "engrossado");
    expect(resultado).toEqual({ modelo: "engrossado", espessuraFinal: undefined });
  });
});

describe("Tampo — os 3 exemplos trabalhados da Seção 3.4.1 (bloco 600+800+400, profundidade do maior 580)", () => {
  // largura = 600+800+400 = 1800; profundidade = 580+30 = 610 (A-06)
  const itens = [modulo(600, 400), modulo(800, 500), modulo(400, 580)];

  it("simples 25mm: 1 peça 1800×610×25mm, fita 3,02m em largura 35mm (3 bordas, sem a de trás) — Task 3.12", () => {
    // Verificação aritmética manual (Modelo-de-Dominio.md 3.4.1):
    // largura = 600+800+400 = 1800; profundidade = max(400,500,580)+30 = 610
    // fita (3 bordas aparentes) = 1800 + 610 + 610 = 3020mm = 3,02m
    // espessura final 25mm ⇒ menor fita ≥ 25 (Seção 2.1) = 35mm
    const el = elemento({
      tipo: "tampo",
      posicao: "superior",
      material: { cor: "Branco TX", espessura: 25 },
    });
    const r = explodeElementoContinuo(el, { itens });
    expect(r.pecas).toHaveLength(1); // 0 sarrafo (peça única, sem auxiliares)
    expect(r.pecas[0]).toMatchObject({ nome: "Placa", quantidade: 1, largura_mm: 1800, altura_mm: 610, espessura_mm: 25 });
    expect(r.fitaM).toBe(3.02);
    expect(larguraFitaMm(25)).toBe(35);
    expect(r.ferragens).toEqual([]); // 0 cola/usinagem — sem ferragem alguma
  });

  it("engrossado nível 1 base 15, 4 lados, sarrafo 70mm: peça 1800×610×15 + 2×(1800×70) + 2×(470×70), fita 3,02m em largura 35mm — Task 3.12", () => {
    // Verificação aritmética manual (Modelo-de-Dominio.md 3.4.1):
    // espessura final = 15×(1+1) = 30mm
    // sarrafos eixo maior (1800) = 2×(1800×70); sarrafos eixo menor = 610−(2×70) = 470 → 2×(470×70)
    // fita (independe da técnica, Seção 2.1) = 1800+610+610 = 3020mm = 3,02m
    // espessura final 30mm ⇒ menor fita ≥ 30 = 35mm
    const el = elemento({
      tipo: "tampo",
      posicao: "superior",
      material: { cor: "Branco TX", espessura: 15 },
      engrossamento: {
        tecnica: "engrossada",
        nivel: 1,
        lados: ["superior", "inferior", "esquerda", "direita"],
        larguraSarrafo: 70,
      },
    });
    expect(modeloDoTampo(el.engrossamento)).toBe("engrossado");

    const r = explodeElementoContinuo(el, { itens });
    const base = r.pecas.find((p) => p.nome === "Placa (base, engrossada)");
    expect(base).toMatchObject({ largura_mm: 1800, altura_mm: 610, espessura_mm: 15 });

    const eixoMaior = r.pecas.filter((p) => p.nome.includes("superior") || p.nome.includes("inferior"));
    expect(eixoMaior).toHaveLength(2);
    for (const p of eixoMaior) expect(p).toMatchObject({ altura_mm: 1800, largura_mm: 70, quantidade: 1 });

    const eixoMenor = r.pecas.filter((p) => p.nome.includes("esquerda") || p.nome.includes("direita"));
    expect(eixoMenor).toHaveLength(2);
    for (const p of eixoMenor) expect(p).toMatchObject({ altura_mm: 470, largura_mm: 70, quantidade: 1 });

    expect(r.fitaM).toBe(3.02); // espessura final 30mm ⇒ fita 35mm; mesma fita do simples 25mm — só a largura da fita muda (catálogo), não o comprimento
    expect(larguraFitaMm(30)).toBe(35);
  });

  it("dobrado nível 1 base 15: 2× (1800×610×15mm), 0 sarrafo, fita 3,02m em largura 35mm — Task 3.12", () => {
    // Verificação aritmética manual (Modelo-de-Dominio.md 3.4.1):
    // espessura final = 15×(1+1) = 30mm; nº de placas = nivel+1 = 2
    // fita = 1800+610+610 = 3020mm = 3,02m; espessura final 30mm ⇒ fita 35mm
    const el = elemento({
      tipo: "tampo",
      posicao: "superior",
      material: { cor: "Branco TX", espessura: 15 },
      engrossamento: { tecnica: "dobrada", nivel: 1 },
    });
    expect(modeloDoTampo(el.engrossamento)).toBe("dobrado");

    const r = explodeElementoContinuo(el, { itens });
    expect(r.pecas).toHaveLength(1);
    expect(r.pecas[0]).toMatchObject({ nome: "Placa (dobrada)", quantidade: 2, largura_mm: 1800, altura_mm: 610, espessura_mm: 15 });
    expect(r.fitaM).toBe(3.02);
    expect(larguraFitaMm(30)).toBe(35);
  });

  it("NIVEL_3_BASE_18 (Seção 2.1) cobre também o tampo, não só engrossamento genérico", () => {
    const el = elemento({
      tipo: "tampo",
      posicao: "superior",
      material: { cor: "Branco TX", espessura: 18 },
      engrossamento: { tecnica: "dobrada", nivel: 3 },
    });
    expect(() => explodeElementoContinuo(el, { itens })).toThrow(/18mm.*n[íi]vel 3|n[íi]vel 3.*18mm/i);
  });
});

describe("Validação de posição por tipo (Seção 3.4)", () => {
  it("posição inválida lança Error com as posições válidas na mensagem", () => {
    const el = elemento({ tipo: "tampo", posicao: "esquerda" });
    expect(() => validarPosicao(el)).toThrow(/tampo.*esquerda/i);
  });

  it("cada tipo aceita só suas posições válidas (tabela da Seção 3.4)", () => {
    expect(() => validarPosicao(elemento({ tipo: "tampo", posicao: "superior" }))).not.toThrow();
    expect(() => validarPosicao(elemento({ tipo: "rodape", posicao: "base" }))).not.toThrow();
    expect(() => validarPosicao(elemento({ tipo: "rodape", posicao: "superior" }))).toThrow();
    expect(() => validarPosicao(elemento({ tipo: "tamponamento", posicao: "topo" }))).not.toThrow();
    expect(() => validarPosicao(elemento({ tipo: "tamponamento", posicao: "superior" }))).toThrow();
    expect(() => validarPosicao(elemento({ tipo: "fechamento", posicao: "direita" }))).not.toThrow();
    expect(() => validarPosicao(elemento({ tipo: "fechamento", posicao: "base" }))).toThrow();
  });

  it("explodeElementoContinuo lança antes de calcular quando a posição é inválida", () => {
    const el = elemento({ tipo: "rodape", posicao: "topo" });
    expect(() => explodeElementoContinuo(el, { itens: [modulo(800, 500)] })).toThrow();
  });
});
