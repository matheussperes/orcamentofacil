import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/clientes — lista os clientes do tenant da sessão (RF-001).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const clientes = await prisma.cliente.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json({ clientes });
}

// POST /api/clientes — cadastra cliente.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.nome) {
    return NextResponse.json({ erro: "Nome é obrigatório." }, { status: 400 });
  }

  const cliente = await prisma.cliente.create({
    data: {
      tenantId: session.tenantId,
      nome: body.nome,
      telefone: body.telefone ?? null,
      email: body.email ?? null,
      endereco: body.endereco ?? null,
      origem: body.origem ?? null,
      arquiteto: body.arquiteto ?? null,
      observacoes: body.observacoes ?? null,
    },
  });
  return NextResponse.json({ cliente }, { status: 201 });
}
