// Task 3.8 (front) — testes puros das funções extraídas de
// CorteMaterialLab.tsx pra edição/reversão de quantidade (mesmo espírito de
// AmbientesLab.test.ts: sem jsdom, `environment: "node"`, então só a lógica
// pura é exercitada aqui). `aplicarResultadoOverride` é o reducer que a
// tela chama depois que a Server Action (mockável nos testes de
// `lib/lista-material/override.test.ts`) já respondeu — não depende de rede.
import { describe, expect, it } from "vitest";
import { aplicarResultadoOverride, validarQuantidadeEditada } from "./CorteMaterialLab";

describe("validarQuantidadeEditada", () => {
  it("aceita zero e números positivos", () => {
    expect(validarQuantidadeEditada(0)).toBeNull();
    expect(validarQuantidadeEditada(12.5)).toBeNull();
  });

  it("rejeita negativo", () => {
    expect(validarQuantidadeEditada(-1)).not.toBeNull();
  });

  it("rejeita NaN", () => {
    expect(validarQuantidadeEditada(NaN)).not.toBeNull();
  });
});

describe("aplicarResultadoOverride", () => {
  it("define/atualiza a quantidade do item quando quantidade != null", () => {
    const atuais = new Map<string, number>();
    const depois = aplicarResultadoOverride(atuais, "Fita de borda", 35);
    expect(depois.get("Fita de borda")).toBe(35);
    // não muta o Map original
    expect(atuais.has("Fita de borda")).toBe(false);
  });

  it("reverte (remove a chave) quando quantidade == null", () => {
    const atuais = new Map([["Fita de borda", 35]]);
    const depois = aplicarResultadoOverride(atuais, "Fita de borda", null);
    expect(depois.has("Fita de borda")).toBe(false);
  });

  it("reverter item sem override ativo é no-op seguro", () => {
    const atuais = new Map<string, number>();
    const depois = aplicarResultadoOverride(atuais, "Fita de borda", null);
    expect(depois.size).toBe(0);
  });
});
