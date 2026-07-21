import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

// Protege as rotas de dados (clientes, orçamentos) e o motor de cálculo.
//
// Task 1.3 (docs/Backlog.md): /api/calcular passou a exigir sessão
// autenticada, mesmo padrão já usado por /api/clientes e /api/orcamentos —
// decisão do operador para eliminar a superfície de fórmulas livres
// (`templates` no body, avaliadas via expr-eval, ver Task 1.2) acessível a
// visitante anônimo. /api/templates (somente leitura da Biblioteca de
// Engenharia padrão) continua público.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.json(
      { erro: "Não autenticado." },
      { status: 401 }
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/clientes/:path*",
    "/api/orcamentos/:path*",
    "/api/calcular/:path*",
  ],
};
