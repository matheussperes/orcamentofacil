import { NextResponse } from "next/server";
import { calcularEngine } from "@/lib/engine/engine";
import { calcularPreco, type ParametrosComerciais } from "@/lib/engine/pricing";
import {
  COMERCIAL_PADRAO,
  MATERIAIS_PADRAO,
  PARAMETROS_FABRICA_PADRAO,
} from "@/lib/engine/defaults";
import type {
  EngineInput,
  ModuloInstanciado,
  ParametrosFabrica,
} from "@/lib/engine/types";

interface RequestBody {
  ambiente?: { tipo?: string; materiais?: Partial<EngineInput["ambiente"]["materiais"]> };
  modulos: ModuloInstanciado[];
  parametros?: Record<string, number>;
  comercial?: Partial<ParametrosComerciais>;
}

// POST /api/calcular — roda o motor de engenharia + pipeline financeiro.
// Núcleo do produto (docs 04 e 05). Alvo de performance: < 2s.
export async function POST(req: Request) {
  const inicio = Date.now();
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!Array.isArray(body.modulos) || body.modulos.length === 0) {
    return NextResponse.json(
      { erro: "Informe ao menos um módulo em 'modulos'." },
      { status: 400 }
    );
  }

  const input: EngineInput = {
    ambiente: {
      tipo: body.ambiente?.tipo ?? "Cozinha",
      materiais: { ...MATERIAIS_PADRAO, ...(body.ambiente?.materiais ?? {}) },
    },
    modulos: body.modulos,
    parametros: {
      ...PARAMETROS_FABRICA_PADRAO,
      ...(body.parametros ?? {}),
    } as ParametrosFabrica,
  };

  const comercial: ParametrosComerciais = {
    ...COMERCIAL_PADRAO,
    ...(body.comercial ?? {}),
  };

  try {
    const engine = calcularEngine(input);
    const financeiro = calcularPreco(engine, comercial);
    return NextResponse.json({
      engine,
      financeiro,
      comercial,
      tempoMs: Date.now() - inicio,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro no cálculo.";
    return NextResponse.json({ erro: msg }, { status: 422 });
  }
}
