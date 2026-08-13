import { describe, expect, it } from "vitest";
import { MIME_TYPES_FOTO_ACEITOS, pathFotoPerfil } from "@/lib/perfil/foto-storage";

// Task 4.11-back — só a lógica pura (path determinístico) é testável sem
// Storage real; upload/signed URL dependem do client Supabase (mesmo padrão
// de `lib/organizacao/logo-storage.test.ts`).
describe("pathFotoPerfil", () => {
  it("gera path determinístico por usuário com extensão do mime type", () => {
    expect(pathFotoPerfil("user-1", "image/png")).toBe("user-1/foto.png");
    expect(pathFotoPerfil("user-1", "image/jpeg")).toBe("user-1/foto.jpg");
    expect(pathFotoPerfil("user-1", "image/webp")).toBe("user-1/foto.webp");
  });

  it("mesmo usuário e mesmo mime type sempre produz o mesmo path (upsert substitui, não acumula)", () => {
    expect(pathFotoPerfil("user-1", "image/png")).toBe(pathFotoPerfil("user-1", "image/png"));
  });

  it("usuários diferentes nunca compartilham o mesmo path", () => {
    expect(pathFotoPerfil("user-1", "image/png")).not.toBe(pathFotoPerfil("user-2", "image/png"));
  });

  it("rejeita mime type não suportado (ex.: SVG)", () => {
    expect(() => pathFotoPerfil("user-1", "image/svg+xml")).toThrow();
  });

  it("MIME_TYPES_FOTO_ACEITOS não inclui SVG", () => {
    expect(MIME_TYPES_FOTO_ACEITOS).not.toContain("image/svg+xml");
  });
});
