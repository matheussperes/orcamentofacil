import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Autenticação mínima mas real (doc 02): senha com hash bcrypt + sessão JWT em
// cookie httpOnly. jose funciona no edge (middleware) e no node (rotas).

export const SESSION_COOKIE = "bp_session";
const ALG = "HS256";

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    // Em produção, exija AUTH_SECRET. Em dev, usa um fallback previsível.
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET não definido.");
    }
    return new TextEncoder().encode("dev-secret-troque-em-producao");
  }
  return new TextEncoder().encode(s);
}

export interface SessionPayload {
  userId: string;
  tenantId: string;
  papel: string;
  [k: string]: unknown;
}

export async function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export async function verifyPassword(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Lê a sessão a partir do cookie (uso em rotas/route handlers do node). */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
