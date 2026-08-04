import { describe, it, expect } from "vitest";
import { normalizarAba } from "./abaAtiva";

describe("normalizarAba", () => {
  it("aceita as 4 abas válidas", () => {
    expect(normalizarAba("ambientes")).toBe("ambientes");
    expect(normalizarAba("corte-material")).toBe("corte-material");
    expect(normalizarAba("financeiro")).toBe("financeiro");
    expect(normalizarAba("proposta")).toBe("proposta");
  });

  it("cai para 'ambientes' quando o parâmetro está ausente", () => {
    expect(normalizarAba(null)).toBe("ambientes");
  });

  it("cai para 'ambientes' quando o parâmetro é inválido", () => {
    expect(normalizarAba("aba-inexistente")).toBe("ambientes");
    expect(normalizarAba("")).toBe("ambientes");
  });
});
