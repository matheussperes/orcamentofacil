import { Parser } from "expr-eval";

// Avaliador matemático seguro (doc 04 / SCHEMA.md).
// Não usa eval nativo. expr-eval só expõe operadores aritméticos e as
// funções de sua whitelist (ceil, floor, min, max, round, abs...).
const parser = new Parser({
  operators: {
    // desabilita construções que não queremos em fórmulas de engenharia
    logical: false,
    comparison: false,
    concatenate: false,
    assignment: false,
  },
});

const NUMERO_PURO = /^\s*-?\d+(\.\d+)?\s*$/;

const cache = new Map<string, ReturnType<typeof parser.parse>>();

/**
 * Avalia uma string de fórmula de template usando o escopo de variáveis
 * (MEDIDA_*, CONFIG_*, PARAM_*). Lança erro se uma variável não estiver
 * declarada no escopo — o que o CI usa para validar templates (doc 09).
 */
export function evalFormula(
  expr: string | number,
  scope: Record<string, number>
): number {
  if (typeof expr === "number") return expr;
  if (NUMERO_PURO.test(expr)) return Number(expr);

  let parsed = cache.get(expr);
  if (!parsed) {
    parsed = parser.parse(expr);
    cache.set(expr, parsed);
  }

  // Garante que toda variável usada existe no escopo.
  for (const variavel of parsed.variables()) {
    if (!(variavel in scope)) {
      throw new Error(
        `Variável não declarada na fórmula "${expr}": ${variavel}`
      );
    }
  }

  const resultado = parsed.evaluate(scope);
  if (typeof resultado !== "number" || !Number.isFinite(resultado)) {
    throw new Error(`Fórmula "${expr}" não resultou em número finito`);
  }
  return resultado;
}

/**
 * Extrai as variáveis referenciadas por uma fórmula (usado na validação de
 * templates no CI).
 */
export function variaveisDaFormula(expr: string | number): string[] {
  if (typeof expr === "number") return [];
  if (NUMERO_PURO.test(expr)) return [];
  return parser.parse(expr).variables();
}
