import { describe, expect, it } from "vitest";
import { confirmacaoExclusaoConfere, validarArquivoFoto, validarArquivoLogo } from "./PerfilLab";

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
