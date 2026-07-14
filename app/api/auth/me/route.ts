import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

// GET /api/auth/me — retorna a sessão atual (ou 401).
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }
  return NextResponse.json({ session });
}
