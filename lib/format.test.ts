import { describe, expect, it } from "vitest";
import { formatarCnpj, formatarTelefone } from "./format";

describe("formatarCnpj", () => {
  it("formata progressivamente conforme dígitos vão sendo digitados", () => {
    expect(formatarCnpj("1")).toBe("1");
    expect(formatarCnpj("12")).toBe("12");
    expect(formatarCnpj("123")).toBe("12.3");
    expect(formatarCnpj("12345")).toBe("12.345");
    expect(formatarCnpj("123456")).toBe("12.345.6");
    expect(formatarCnpj("12345678")).toBe("12.345.678");
    expect(formatarCnpj("123456780001")).toBe("12.345.678/0001");
    expect(formatarCnpj("12345678000195")).toBe("12.345.678/0001-95");
  });

  it("lida com string suja (colar valor já formatado ou misto)", () => {
    expect(formatarCnpj("12.345.678/0001-95")).toBe("12.345.678/0001-95");
    expect(formatarCnpj("12345678000195extra")).toBe("12.345.678/0001-95");
  });

  it("trunca em 14 dígitos", () => {
    expect(formatarCnpj("123456780001959999")).toBe("12.345.678/0001-95");
  });

  it("mantém campo vazio vazio", () => {
    expect(formatarCnpj("")).toBe("");
  });
});

describe("formatarTelefone", () => {
  it("formata progressivamente e mantém fixo (10 dígitos)", () => {
    expect(formatarTelefone("1")).toBe("(1");
    expect(formatarTelefone("11")).toBe("(11");
    expect(formatarTelefone("113")).toBe("(11) 3");
    expect(formatarTelefone("1133334444")).toBe("(11) 3333-4444");
  });

  it("troca automaticamente para celular ao chegar no 11º dígito", () => {
    expect(formatarTelefone("11933334444")).toBe("(11) 93333-4444");
  });

  it("lida com string suja (colar valor já formatado ou só dígitos)", () => {
    expect(formatarTelefone("(11) 91234-5678")).toBe("(11) 91234-5678");
    expect(formatarTelefone("11912345678")).toBe("(11) 91234-5678");
  });

  it("trunca em 11 dígitos", () => {
    expect(formatarTelefone("119123456789999")).toBe("(11) 91234-5678");
  });

  it("mantém campo vazio vazio", () => {
    expect(formatarTelefone("")).toBe("");
  });
});
