import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
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
  ModuloTemplate,
  ParametrosFabrica,
} from "@/lib/engine/types";
import {
  TemplatesValidationError,
  validarTemplatesBody,
} from "@/lib/validation/templates";

interface RequestBody {
  ambiente?: { tipo?: string; materiais?: Partial<EngineInput["ambiente"]["materiais"]> };
  modulos: ModuloInstanciado[];
  parametros?: Record<string, number>;
  comercial?: Partial<ParametrosComerciais>;
  templates?: Record<string, ModuloTemplate>; // V2-4 (overrides de engenharia)
}

// POST /api/calcular — roda o motor de engenharia + pipeline financeiro.
// Núcleo do produto (docs 04 e 05). Alvo de performance: < 2s.
//
// Task 1.3 (docs/Backlog.md): rota passou a exigir sessão autenticada —
// mesmo padrão de /api/clientes e /api/orcamentos (lib/auth.ts,
// middleware.ts). Decisão do operador: a superfície de fórmulas livres
// (`templates` no body, avaliadas via expr-eval — ver Task 1.2) não fica
// mais acessível a visitante anônimo.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

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

  try {
    validarTemplatesBody(body.templates);
  } catch (e) {
    if (e instanceof TemplatesValidationError) {
      return NextResponse.json({ erro: e.message }, { status: 400 });
    }
    throw e;
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
    templates: body.templates,
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
