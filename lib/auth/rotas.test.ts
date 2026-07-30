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

  it("trata /dev/preview como pública (harness de preview do Dashboard, Task 13.3b — 404 em produção é responsabilidade da própria rota)", () => {
    expect(isRotaPublica("/dev/preview")).toBe(true);
  });

  it("trata /dev/preview/orcamento e /dev/preview/orcamento/novo como públicas (harness do shell de orçamento, Task 13.3c — 404 em produção é responsabilidade da própria rota)", () => {
    expect(isRotaPublica("/dev/preview/orcamento")).toBe(true);
    expect(isRotaPublica("/dev/preview/orcamento/novo")).toBe(true);
  });

  it("não trata /orcamento/[id] real como pública — só os harnesses /dev/preview/* são", () => {
    expect(isRotaPublica("/orcamento/abc-123")).toBe(false);
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
