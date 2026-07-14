import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signSession, SESSION_COOKIE } from "@/lib/auth";

// POST /api/auth/register — cria tenant + usuário admin e já inicia a sessão.
export async function POST(req: Request) {
  const { nome, email, senha, empresa } = await req.json().catch(() => ({}));
  if (!email || !senha || !nome) {
    return NextResponse.json(
      { erro: "Informe nome, email e senha." },
      { status: 400 }
    );
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    return NextResponse.json({ erro: "E-mail já cadastrado." }, { status: 409 });
  }

  const tenant = await prisma.tenant.create({
    data: { nome: empresa ?? `${nome} — Marcenaria` },
  });
  const usuario = await prisma.usuario.create({
    data: {
      tenantId: tenant.id,
      nome,
      email,
      papel: "admin",
      senhaHash: await hashPassword(senha),
    },
  });

  const token = await signSession({
    userId: usuario.id,
    tenantId: tenant.id,
    papel: usuario.papel,
  });
  const res = NextResponse.json({
    usuario: { id: usuario.id, nome, email, papel: usuario.papel },
    tenantId: tenant.id,
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
