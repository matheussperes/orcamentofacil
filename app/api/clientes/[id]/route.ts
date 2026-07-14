import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function garantirDono(id: string, tenantId: string) {
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  return cliente && cliente.tenantId === tenantId ? cliente : null;
}

// PUT /api/clientes/:id — edição.
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!(await garantirDono(params.id, session.tenantId))) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const cliente = await prisma.cliente.update({
    where: { id: params.id },
    data: {
      nome: body.nome,
      telefone: body.telefone,
      email: body.email,
      endereco: body.endereco,
      origem: body.origem,
      arquiteto: body.arquiteto,
      observacoes: body.observacoes,
      status: body.status,
    },
  });
  return NextResponse.json({ cliente });
}

// DELETE /api/clientes/:id — exclusão.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!(await garantirDono(params.id, session.tenantId))) {
    return NextResponse.json({ erro: "Cliente não encontrado." }, { status: 404 });
  }

  await prisma.cliente.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
