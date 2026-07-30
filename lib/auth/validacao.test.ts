import { describe, expect, it } from "vitest";
import { senhaValida, senhasConferem } from "./validacao";

describe("senhaValida", () => {
  it("rejeita senha com menos de 8 caracteres", () => {
    expect(senhaValida("1234567")).toBe(false);
  });

  it("aceita senha com exatamente 8 caracteres", () => {
    expect(senhaValida("12345678")).toBe(true);
  });

  it("aceita senha com mais de 8 caracteres", () => {
    expect(senhaValida("umaSenhaBemLonga123")).toBe(true);
  });

  it("rejeita senha vazia", () => {
    expect(senhaValida("")).toBe(false);
  });
});

describe("senhasConferem", () => {
  it("aceita quando senha e confirmação são iguais e não vazias", () => {
    expect(senhasConferem("abc12345", "abc12345")).toBe(true);
  });

  it("rejeita quando diferem", () => {
    expect(senhasConferem("abc12345", "abc12346")).toBe(false);
  });

  it("rejeita quando ambas vazias (evita falso-positivo de string vazia === string vazia)", () => {
    expect(senhasConferem("", "")).toBe(false);
  });
});
