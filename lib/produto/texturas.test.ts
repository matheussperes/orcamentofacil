// Task 3.13 (catálogo-front) — testes de `listarTexturas`/`urlPublicaTextura`
// (bucket público `texturas`). Mesmo estilo de mock local de
// `@/lib/supabase/client`/`@/lib/supabase/server` já usado em
// `lib/produto/acoes.test.ts`.
import { describe, expect, it, vi } from "vitest";
import { listarTexturas, urlPublicaTextura } from "./texturas";

const listarMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    storage: {
      from: (bucket: string) => ({
        list: () => listarMock(bucket),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.exemplo/${bucket}/${path}` },
        }),
      }),
    },
  }),
}));

describe("listarTexturas", () => {
  it("bucket vazio devolve lista vazia (estado esperado, não erro)", async () => {
    listarMock.mockResolvedValueOnce({ data: [], error: null });
    expect(await listarTexturas()).toEqual([]);
  });

  it("erro do Storage devolve lista vazia em vez de lançar", async () => {
    listarMock.mockResolvedValueOnce({ data: null, error: { message: "falhou" } });
    expect(await listarTexturas()).toEqual([]);
  });

  it("mapeia arquivos pra path + url pública, ignorando pastas (id null)", async () => {
    listarMock.mockResolvedValueOnce({
      data: [
        { id: "1", name: "branco-tx.webp" },
        { id: null, name: "subpasta" },
      ],
      error: null,
    });
    expect(await listarTexturas()).toEqual([
      {
        path: "branco-tx.webp",
        nome: "branco-tx.webp",
        url: "https://storage.exemplo/texturas/branco-tx.webp",
      },
    ]);
  });
});

describe("urlPublicaTextura", () => {
  it("resolve caminho relativo pra URL pública do bucket", () => {
    expect(urlPublicaTextura("branco-tx.webp")).toBe(
      "https://storage.exemplo/texturas/branco-tx.webp"
    );
  });
});
