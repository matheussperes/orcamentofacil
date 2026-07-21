import { describe, it, expect, vi, beforeEach } from "vitest";

// Task 1.3 (docs/Backlog.md): /api/calcular passou a exigir sessão
// autenticada, mesmo padrão de /api/clientes e /api/orcamentos. `lib/auth`
// usa `next/headers` (cookies()), que só funciona dentro do request-scope
// real do Next.js — em teste unitário mockamos o módulo inteiro para
// controlar a sessão sem depender desse contexto.
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/lib/auth";
import { POST } from "./route";

const modulosValidos = [
  {
    id: "m1",
    templateCodigo: "BASE_PORTAS",
    largura_mm: 600,
    altura_mm: 720,
    profundidade_mm: 550,
    config: { CONFIG_QTD_PORTAS: 2, CONFIG_QTD_PRATELEIRAS: 1 },
  },
];

function postRequest(body: unknown): Request {
  return new Request("http://localhost/api/calcular", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/calcular — autenticação obrigatória (Task 1.3)", () => {
  beforeEach(() => {
    vi.mocked(getSession).mockReset();
  });

  it("retorna 401 quando a requisição não tem sessão", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await POST(postRequest({ modulos: modulosValidos }));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.erro).toMatch(/autenticado/i);
  });

  it("processa normalmente quando a sessão é válida", async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: "u1",
      tenantId: "t1",
      papel: "admin",
    });

    const res = await POST(postRequest({ modulos: modulosValidos }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.engine).toBeDefined();
    expect(json.financeiro).toBeDefined();
  });

  it("rejeita 'templates' malformado (validação estrutural — Task 1.3) com 400, mesmo autenticado", async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: "u1",
      tenantId: "t1",
      papel: "admin",
    });

    const formulaGigante = "1+".repeat(400) + "1"; // > 500 caracteres
    const res = await POST(
      postRequest({
        modulos: modulosValidos,
        templates: {
          BASE_PORTAS: { quantidade: formulaGigante },
        },
      })
    );

    expect(res.status).toBe(400);
  });

  it("rejeita 'templates' contendo chave perigosa (__proto__) com 400", async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: "u1",
      tenantId: "t1",
      papel: "admin",
    });

    const templatesMaliciosos = JSON.parse(
      '{"BASE_PORTAS": {"__proto__": {"polluted": "sim"}}}'
    );

    const res = await POST(
      postRequest({ modulos: modulosValidos, templates: templatesMaliciosos })
    );

    expect(res.status).toBe(400);
    expect(
      (Object.prototype as unknown as Record<string, unknown>).polluted
    ).toBeUndefined();
  });
});
