import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/orcamentos — lista os orçamentos do tenant (RF-002).
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const orcamentos = await prisma.orcamento.findMany({
    where: { tenantId: session.tenantId },
    include: { cliente: { select: { nome: true } } },
    orderBy: { data: "desc" },
  });
  return NextResponse.json({ orcamentos });
}

// POST /api/orcamentos — cria um orçamento vinculado a um cliente.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.clienteId) {
    return NextResponse.json({ erro: "clienteId é obrigatório." }, { status: 400 });
  }

  const cliente = await prisma.cliente.findUnique({ where: { id: body.clienteId } });
  if (!cliente || cliente.tenantId !== session.tenantId) {
    return NextResponse.json({ erro: "Cliente inválido." }, { status: 400 });
  }

  const orcamento = await prisma.orcamento.create({
    data: {
      tenantId: session.tenantId,
      clienteId: body.clienteId,
      responsavelId: session.userId,
      observacoes: body.observacoes ?? null,
      formaPagamento: body.formaPagamento ?? null,
    },
  });
  return NextResponse.json({ orcamento }, { status: 201 });
}
