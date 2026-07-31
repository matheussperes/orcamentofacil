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

  it("trata /dev/preview/orcamento/item como pública (harness do núcleo do Editor de Item, Task 13.3e — 404 em produção é responsabilidade da própria rota)", () => {
    expect(isRotaPublica("/dev/preview/orcamento/item")).toBe(true);
  });

  it("trata /dev/preview/proposta-pdf como pública (harness do documento imprimível, Task 13.6b — 404 em produção é responsabilidade da própria rota)", () => {
    expect(isRotaPublica("/dev/preview/proposta-pdf")).toBe(true);
  });

  it("trata /dev/preview/perfil como pública (harness de /perfil, Task 13.7a — 404 em produção é responsabilidade da própria rota)", () => {
    expect(isRotaPublica("/dev/preview/perfil")).toBe(true);
  });

  it("não trata /orcamento/[id] real nem /orcamento/[id]/item/[itemId] como públicas — só os harnesses /dev/preview/* são", () => {
    expect(isRotaPublica("/orcamento/abc-123")).toBe(false);
    expect(isRotaPublica("/orcamento/abc-123/item/xyz-789")).toBe(false);
  });

  it("não trata /proposta/[id]/pdf real como pública — só o harness /dev/preview/proposta-pdf é (D-18, só o dono da organização vê a proposta)", () => {
    expect(isRotaPublica("/proposta/abc-123/pdf")).toBe(false);
  });

  it("trata a raiz (Dashboard) como protegida", () => {
    expect(isRotaPublica("/")).toBe(false);
  });

  it("trata /perfil real como protegida — só o harness /dev/preview/perfil é pública (Task 13.7a)", () => {
    expect(isRotaPublica("/perfil")).toBe(false);
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
