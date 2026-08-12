import { describe, expect, it } from "vitest";
import {
  ESPESSURAS_VALIDAS_POR_MODELO_TAMPO,
  OPCOES_ESPESSURA_ENGROSSAMENTO,
} from "./types";

// Task 3.10–3.11 (front) — confirma que a tabela de opções do Select de UI
// (base+nível → espessura final) bate exatamente com a união de espessuras
// válidas que o motor já valida (`ESPESSURAS_VALIDAS_POR_MODELO_TAMPO`), fonte
// única de verdade. Se um dos dois divergir, um deles está errado.
describe("OPCOES_ESPESSURA_ENGROSSAMENTO", () => {
  it("tem exatamente 5 combinações", () => {
    expect(OPCOES_ESPESSURA_ENGROSSAMENTO).toHaveLength(5);
  });

  it("bate com a união de ESPESSURAS_VALIDAS_POR_MODELO_TAMPO.engrossado/.dobrado", () => {
    const esperado = new Set([
      ...ESPESSURAS_VALIDAS_POR_MODELO_TAMPO.engrossado,
      ...ESPESSURAS_VALIDAS_POR_MODELO_TAMPO.dobrado,
    ]);
    const obtido = new Set(OPCOES_ESPESSURA_ENGROSSAMENTO.map((o) => o.espessuraFinal));
    expect(obtido).toEqual(esperado);
  });

  it("nunca inclui 6mm nem 25mm", () => {
    const valores = OPCOES_ESPESSURA_ENGROSSAMENTO.map((o) => o.espessuraFinal);
    expect(valores).not.toContain(6);
    expect(valores).not.toContain(25);
  });

  it("espessuraFinal = espessuraBase * (1 + nivel), Seção 2.1", () => {
    for (const opcao of OPCOES_ESPESSURA_ENGROSSAMENTO) {
      expect(opcao.espessuraFinal).toBe(opcao.espessuraBase * (1 + opcao.nivel));
    }
  });
});
