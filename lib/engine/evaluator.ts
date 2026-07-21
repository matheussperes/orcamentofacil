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

// --- Mitigação compensatória: expr-eval@2.0.2 sem fix disponível ---------
// expr-eval@2.0.2 tem duas vulnerabilidades altas sem correção publicada na
// versão atual do pacote:
//   - GHSA-8gw3-rxh4-v6jx (Prototype Pollution via chaves de `scope`/`expr`)
//   - GHSA-jc85-fpwf-qm7x (execução de função não restrita)
// Como não há upgrade possível hoje (ver docs/Backlog.md, Task 1.2), a
// correção é compensatória no ponto de uso, não uma correção da lib em si:
// bloqueamos explicitamente qualquer fórmula ou chave de `scope` que
// referencie `__proto__`, `constructor` ou `prototype`, que são os vetores
// conhecidos de poluição de protótipo através do parser/avaliador.
const CHAVES_PERIGOSAS = ["__proto__", "constructor", "prototype"];

function contemChavePerigosa(texto: string): boolean {
  return CHAVES_PERIGOSAS.some((chave) => texto.includes(chave));
}

function validarSemPolucaoDePrototipo(
  expr: string,
  scope: Record<string, number>
): void {
  if (contemChavePerigosa(expr)) {
    throw new Error(
      `Fórmula "${expr}" contém identificador não permitido (__proto__/constructor/prototype) — bloqueado por mitigação de segurança (GHSA-8gw3-rxh4-v6jx / GHSA-jc85-fpwf-qm7x).`
    );
  }

  for (const chave of Object.keys(scope)) {
    if (contemChavePerigosa(chave)) {
      throw new Error(
        `Chave de escopo "${chave}" não é permitida (__proto__/constructor/prototype) — bloqueado por mitigação de segurança (GHSA-8gw3-rxh4-v6jx / GHSA-jc85-fpwf-qm7x).`
      );
    }
  }
}

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

  validarSemPolucaoDePrototipo(expr, scope);

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

  // Escopo congelado: mesmo que o parser tente escrever no objeto passado a
  // `evaluate`, uma tentativa de mutação em modo estrito lança em vez de
  // silenciosamente poluir o objeto (defesa em profundidade além do
  // bloqueio explícito de chaves acima).
  const resultado = parsed.evaluate(Object.freeze({ ...scope }));
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
