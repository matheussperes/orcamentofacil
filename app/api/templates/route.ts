import { NextResponse } from "next/server";
import { listarTemplates } from "@/lib/engine/templates";

// GET /api/templates — lista a Biblioteca de Engenharia disponível (metadados
// para o wizard montar o catálogo de módulos).
export function GET() {
  const templates = listarTemplates().map((t) => ({
    codigo: t.codigo,
    nome: t.nome,
    categoria: t.categoria,
    versao: t.versao,
    limites: t.limites,
    config_padrao: t.config_padrao,
  }));
  return NextResponse.json({ templates });
}
