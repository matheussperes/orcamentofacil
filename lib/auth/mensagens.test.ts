import { describe, expect, it } from "vitest";
import { mensagemErroLogin, mensagemErroSignup } from "./mensagens";

describe("mensagemErroLogin", () => {
  it("traduz credenciais inválidas", () => {
    expect(mensagemErroLogin("Invalid login credentials")).toBe(
      "E-mail ou senha incorretos. Verifique e tente de novo."
    );
  });

  it("traduz e-mail não confirmado", () => {
    expect(mensagemErroLogin("Email not confirmed")).toContain("Confirme seu e-mail");
  });

  it("traduz rate limit", () => {
    expect(mensagemErroLogin("Request rate limit reached")).toContain("Muitas tentativas");
  });

  it("usa mensagem genérica para erro desconhecido (nunca o erro cru)", () => {
    const msg = mensagemErroLogin("some obscure internal error XYZ-500");
    expect(msg).not.toContain("XYZ-500");
    expect(msg).toContain("Não foi possível entrar");
  });
});

describe("mensagemErroSignup", () => {
  it("traduz e-mail já cadastrado", () => {
    expect(mensagemErroSignup("User already registered")).toContain("já está cadastrado");
  });

  it("traduz senha inválida", () => {
    expect(mensagemErroSignup("Password should be at least 6 characters")).toContain(
      "pelo menos 8 caracteres"
    );
  });

  it("usa mensagem genérica para erro desconhecido (nunca o erro cru)", () => {
    const msg = mensagemErroSignup("some obscure internal error XYZ-500");
    expect(msg).not.toContain("XYZ-500");
    expect(msg).toContain("Não foi possível criar sua conta");
  });
});
