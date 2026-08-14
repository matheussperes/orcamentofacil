import { describe, expect, it } from "vitest";
import { confirmacaoExclusaoConfere, sanitizarKerf, validarArquivoFoto, validarArquivoLogo } from "./PerfilLab";

// Task 4.8-4.9-front — só a validação pura (mime/tamanho, checada ANTES do
// upload) é testável sem Supabase; o fluxo de upload em si depende do client
// browser (mesmo padrão de `lib/organizacao/logo-storage.test.ts`, que
// também só cobre a parte pura).
function arquivoFake(nome: string, mimeType: string, tamanhoBytes: number): File {
  return new File([new Uint8Array(tamanhoBytes)], nome, { type: mimeType });
}

describe("validarArquivoLogo", () => {
  it("aceita PNG/JPEG/WEBP dentro do limite de 2 MB", () => {
    expect(validarArquivoLogo(arquivoFake("logo.png", "image/png", 1024))).toBeNull();
    expect(validarArquivoLogo(arquivoFake("logo.jpg", "image/jpeg", 1024))).toBeNull();
    expect(validarArquivoLogo(arquivoFake("logo.webp", "image/webp", 1024))).toBeNull();
  });

  it("rejeita mime type não suportado (ex.: SVG)", () => {
    expect(validarArquivoLogo(arquivoFake("logo.svg", "image/svg+xml", 1024))).toMatch(/não suportado/i);
  });

  it("rejeita arquivo maior que 2 MB", () => {
    expect(validarArquivoLogo(arquivoFake("logo.png", "image/png", 2 * 1024 * 1024 + 1))).toMatch(/grande/i);
  });

  it("aceita arquivo exatamente no limite de 2 MB", () => {
    expect(validarArquivoLogo(arquivoFake("logo.png", "image/png", 2 * 1024 * 1024))).toBeNull();
  });
});

// Task 4.11-front — réplica dos mesmos casos pra `validarArquivoFoto`
// (foto de perfil pessoal, mesmo limite e mimes do bucket `perfil-fotos`).
describe("validarArquivoFoto", () => {
  it("aceita PNG/JPEG/WEBP dentro do limite de 2 MB", () => {
    expect(validarArquivoFoto(arquivoFake("foto.png", "image/png", 1024))).toBeNull();
    expect(validarArquivoFoto(arquivoFake("foto.jpg", "image/jpeg", 1024))).toBeNull();
    expect(validarArquivoFoto(arquivoFake("foto.webp", "image/webp", 1024))).toBeNull();
  });

  it("rejeita mime type não suportado (ex.: SVG)", () => {
    expect(validarArquivoFoto(arquivoFake("foto.svg", "image/svg+xml", 1024))).toMatch(/não suportado/i);
  });

  it("rejeita arquivo maior que 2 MB", () => {
    expect(validarArquivoFoto(arquivoFake("foto.png", "image/png", 2 * 1024 * 1024 + 1))).toMatch(/grande/i);
  });

  it("aceita arquivo exatamente no limite de 2 MB", () => {
    expect(validarArquivoFoto(arquivoFake("foto.png", "image/png", 2 * 1024 * 1024))).toBeNull();
  });
});

// Task 4.15 (Design-System 7.11) — o campo de digitacao e a ultima barreira
// antes da unica operacao irreversivel e multi-tenant do produto: liberar o
// botao com um texto que nao bate seria pior que nao ter o campo.
describe("confirmacaoExclusaoConfere", () => {
  it("libera so com o nome exato da organizacao", () => {
    expect(confirmacaoExclusaoConfere("Marcenaria Boa Vista", "Marcenaria Boa Vista")).toBe(true);
  });

  it("tolera espaco acidental nas pontas", () => {
    expect(confirmacaoExclusaoConfere("  Marcenaria Boa Vista ", "Marcenaria Boa Vista")).toBe(true);
  });

  it("nao libera com caixa diferente, acento faltando, prefixo ou vazio", () => {
    expect(confirmacaoExclusaoConfere("marcenaria boa vista", "Marcenaria Boa Vista")).toBe(false);
    expect(confirmacaoExclusaoConfere("Marcenaria Sao Joao", "Marcenaria São João")).toBe(false);
    expect(confirmacaoExclusaoConfere("Marcenaria", "Marcenaria Boa Vista")).toBe(false);
    expect(confirmacaoExclusaoConfere("", "Marcenaria Boa Vista")).toBe(false);
  });

  it("nunca libera quando a organizacao nao tem nome (campo vazio nao vira senha vazia)", () => {
    expect(confirmacaoExclusaoConfere("", "")).toBe(false);
    expect(confirmacaoExclusaoConfere("   ", "  ")).toBe(false);
  });
});

// Task 4.16-front (Modelo-de-Dominio 8.2, A-13/A-14) — kerf é sempre um
// numero (0 e default valido, nunca sentinela), e nunca negativo (mesmo
// `check` da migration 4.16-back). `sanitizarKerf` roda no `onChange` do
// campo em `SecaoOrganizacao`.
describe("sanitizarKerf", () => {
  it("mantem o valor inicial vindo do prop quando ja valido (round-trip sem input)", () => {
    expect(sanitizarKerf(3)).toBe(3);
    expect(sanitizarKerf(4.5)).toBe(4.5);
  });

  it("aceita 0 como valor valido, nao trata como vazio", () => {
    expect(sanitizarKerf(0)).toBe(0);
  });

  it("rejeita negativo, nunca deixa o estado assumir valor abaixo de zero", () => {
    expect(sanitizarKerf(-1)).toBe(0);
    expect(sanitizarKerf(-3.2)).toBe(0);
  });

  it("entrada invalida (NaN, de campo vazio ou nao numerico) cai para 0, nao propaga NaN", () => {
    expect(sanitizarKerf(Number.NaN)).toBe(0);
  });
});
