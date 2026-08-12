// Task 4.1-4.3-4.5 — testes puros das funções extraídas de
// FormularioProdutoDialog.tsx (unificação de RF-30). Mesmo espírito de
// AmbientesLab.test.ts: sem jsdom no ambiente de teste (vitest.config.ts,
// `environment: "node"`), só a lógica pura é exercitada aqui.
import { describe, expect, it } from "vitest";
import {
  montarEspecificacao,
  proximoNomeAoTrocarCodigoFerragem,
  unidadeDoTipo,
  unidadePrecoParaExibicao,
} from "./FormularioProdutoDialog";
import { CODIGOS_FERRAGEM_FIXOS, nomeAmigavelFerragem, unidadePadraoFerragem } from "@/lib/produto/tipos";

describe("montarEspecificacao", () => {
  const camposBase = { cor: "", espessura: 0, texturaUrl: undefined, codigoFerragem: "" };

  it("chapa: cor, espessura e texturaUrl", () => {
    const espec = montarEspecificacao("chapa", { ...camposBase, cor: "Branco TX", espessura: 15, texturaUrl: "tex.png" });
    expect(espec).toEqual({ cor: "Branco TX", espessura: 15, texturaUrl: "tex.png" });
  });

  it("ferragem: codigo fixo + unidade padrão do código", () => {
    const codigo = CODIGOS_FERRAGEM_FIXOS[0];
    const espec = montarEspecificacao("ferragem", { ...camposBase, codigoFerragem: codigo });
    expect(espec).toEqual({ codigo, unidade: unidadePadraoFerragem(codigo) });
  });

  it("fita: unidade fixa 'm'", () => {
    expect(montarEspecificacao("fita", camposBase)).toEqual({ unidade: "m" });
  });

  it("led/acessorio: especificação vazia", () => {
    expect(montarEspecificacao("led", camposBase)).toEqual({});
    expect(montarEspecificacao("acessorio", camposBase)).toEqual({});
  });
});

describe("unidadeDoTipo / unidadePrecoParaExibicao", () => {
  it("só fita tem unidade fixa", () => {
    expect(unidadeDoTipo("fita")).toBe("m");
    expect(unidadeDoTipo("led")).toBeNull();
    expect(unidadeDoTipo("acessorio")).toBeNull();
    expect(unidadeDoTipo("chapa")).toBeNull();
  });

  it("ferragem usa a unidade padrão do código escolhido", () => {
    const codigo = CODIGOS_FERRAGEM_FIXOS[0];
    expect(unidadePrecoParaExibicao("ferragem", codigo)).toBe(unidadePadraoFerragem(codigo));
  });
});

describe("proximoNomeAoTrocarCodigoFerragem", () => {
  it("nome vazio: auto-preenche com o nome amigável do novo código", () => {
    const [c1, c2] = CODIGOS_FERRAGEM_FIXOS;
    expect(proximoNomeAoTrocarCodigoFerragem("", c1, c2)).toBe(nomeAmigavelFerragem(c2));
  });

  it("nome ainda igual ao nome amigável do código anterior: continua auto-preenchendo", () => {
    const [c1, c2] = CODIGOS_FERRAGEM_FIXOS;
    const nomeAutomatico = nomeAmigavelFerragem(c1);
    expect(proximoNomeAoTrocarCodigoFerragem(nomeAutomatico, c1, c2)).toBe(nomeAmigavelFerragem(c2));
  });

  it("nome customizado pelo usuário: preservado ao trocar o código", () => {
    const [c1, c2] = CODIGOS_FERRAGEM_FIXOS;
    expect(proximoNomeAoTrocarCodigoFerragem("Dobradiça reforçada", c1, c2)).toBe("Dobradiça reforçada");
  });
});
