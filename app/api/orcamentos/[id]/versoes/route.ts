import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function garantirOrcamento(id: string, tenantId: string) {
  const orc = await prisma.orcamento.findUnique({ where: { id } });
  return orc && orc.tenantId === tenantId ? orc : null;
}

// GET /api/orcamentos/:id/versoes — histórico de versões (RF-009).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  if (!(await garantirOrcamento(params.id, session.tenantId))) {
    return NextResponse.json({ erro: "Orçamento não encontrado." }, { status: 404 });
  }

  const versoes = await prisma.orcamentoVersao.findMany({
    where: { orcamentoId: params.id },
    orderBy: { numero: "desc" },
  });
  return NextResponse.json({ versoes });
}

// POST /api/orcamentos/:id/versoes — grava um snapshot imutável (append-only).
// Recebe o resultado da engine + custos + comercial (doc 05) e congela os
// preços utilizados para reprodutibilidade.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  const orc = await garantirOrcamento(params.id, session.tenantId);
  if (!orc) {
    return NextResponse.json({ erro: "Orçamento não encontrado." }, { status: 404 });
  }

  const snapshot = await req.json().catch(() => null);
  if (!snapshot) {
    return NextResponse.json({ erro: "Snapshot ausente." }, { status: 400 });
  }

  const proximo = orc.versaoAtual + 1;
  const [versao] = await prisma.$transaction([
    prisma.orcamentoVersao.create({
      data: {
        orcamentoId: params.id,
        numero: proximo,
        autorId: session.userId,
        motivo: snapshot.motivo ?? null,
        snapshot,
      },
    }),
    prisma.orcamento.update({
      where: { id: params.id },
      data: { versaoAtual: proximo },
    }),
  ]);

  return NextResponse.json({ versao }, { status: 201 });
}
