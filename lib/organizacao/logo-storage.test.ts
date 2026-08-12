import { describe, expect, it } from "vitest";
import { MIME_TYPES_LOGO_ACEITOS, pathLogoOrganizacao } from "@/lib/organizacao/logo-storage";

// Task 4.8-4.9-back — só a lógica pura (path determinístico) é testável sem
// Storage real; upload/signed URL dependem do client Supabase (mesmo padrão
// de `lib/linha-proposta/storage.ts`, que também não tem teste unitário
// próprio pelas mesmas razões).
describe("pathLogoOrganizacao", () => {
  it("gera path determinístico por organização com extensão do mime type", () => {
    expect(pathLogoOrganizacao("org-1", "image/png")).toBe("org-1/logo.png");
    expect(pathLogoOrganizacao("org-1", "image/jpeg")).toBe("org-1/logo.jpg");
    expect(pathLogoOrganizacao("org-1", "image/webp")).toBe("org-1/logo.webp");
  });

  it("mesma organização e mesmo mime type sempre produz o mesmo path (upsert substitui, não acumula)", () => {
    expect(pathLogoOrganizacao("org-1", "image/png")).toBe(pathLogoOrganizacao("org-1", "image/png"));
  });

  it("organizações diferentes nunca compartilham o mesmo path", () => {
    expect(pathLogoOrganizacao("org-1", "image/png")).not.toBe(pathLogoOrganizacao("org-2", "image/png"));
  });

  it("rejeita mime type não suportado (ex.: SVG)", () => {
    expect(() => pathLogoOrganizacao("org-1", "image/svg+xml")).toThrow();
  });

  it("MIME_TYPES_LOGO_ACEITOS não inclui SVG", () => {
    expect(MIME_TYPES_LOGO_ACEITOS).not.toContain("image/svg+xml");
  });
});
