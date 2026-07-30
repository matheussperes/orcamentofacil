import { describe, expect, it } from "vitest";
import { isRotaPublica } from "./rotas";

describe("isRotaPublica", () => {
  it("trata /login como pública", () => {
    expect(isRotaPublica("/login")).toBe(true);
  });

  it("trata /signup como pública", () => {
    expect(isRotaPublica("/signup")).toBe(true);
  });

  it("trata /auth/confirm como pública (callback do link de confirmação de e-mail, clicado sem sessão)", () => {
    expect(isRotaPublica("/auth/confirm")).toBe(true);
  });

  it("trata a raiz (Dashboard) como protegida", () => {
    expect(isRotaPublica("/")).toBe(false);
  });

  it("trata os laboratórios (/modulo, /biblioteca, /ambientes) como protegidos — decisão 13.3a", () => {
    expect(isRotaPublica("/modulo")).toBe(false);
    expect(isRotaPublica("/biblioteca")).toBe(false);
    expect(isRotaPublica("/ambientes")).toBe(false);
  });

  it("não trata prefixo/subrota como pública (match exato, não startsWith)", () => {
    expect(isRotaPublica("/login/algumacoisa")).toBe(false);
    expect(isRotaPublica("/loginzinho")).toBe(false);
  });
});
