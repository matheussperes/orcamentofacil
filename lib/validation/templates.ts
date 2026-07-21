// Validação estrutural do body `templates` de POST /api/calcular
// (Task 1.3, docs/Backlog.md).
//
// Decisão de implementação: validação manual (sem zod/joi/ajv) em vez de
// introduzir uma dependência nova de schema. O objetivo aqui não é validar
// regras de negócio do domínio (isso continua sendo responsabilidade do
// motor em lib/engine), e sim impedir que um payload desproporcionalmente
// grande, profundo ou com chaves perigosas chegue ao `expr-eval`
// (lib/engine/evaluator.ts) antes de ser avaliado — um guard-rail de
// tamanho/forma, não um validador de schema completo. Dado o escopo restrito
// (um objeto de profundidade e tamanho pequenos, já fortemente tipado em
// lib/engine/types.ts), uma lib de schema completa seria desproporcional.
// Se `templates` ganhar mais variações de formato no futuro, reavaliar zod.

const MAX_TEMPLATES = 50;
const MAX_DEPTH = 6;
const MAX_STRING_LENGTH = 500; // cobre fórmulas (quantidade, dimensoes.*) e nomes/códigos
const MAX_ARRAY_LENGTH = 100;
const MAX_OBJECT_KEYS = 100;
const MAX_TOTAL_NODES = 2000;

// Mesmas chaves bloqueadas pela mitigação de prototype pollution do
// evaluator (Task 1.2) — bloquear aqui também, na borda da API, é defesa em
// profundidade: rejeita o payload cedo, com HTTP 400, em vez de deixar o
// erro estourar só dentro do motor de cálculo.
const CHAVE_PERIGOSA = new Set(["__proto__", "constructor", "prototype"]);

export class TemplatesValidationError extends Error {}

function isPlainObject(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function validarNo(
  valor: unknown,
  caminho: string,
  profundidade: number,
  contador: { total: number }
): void {
  contador.total += 1;
  if (contador.total > MAX_TOTAL_NODES) {
    throw new TemplatesValidationError(
      `'templates' excede o número máximo de nós permitido (${MAX_TOTAL_NODES}).`
    );
  }
  if (profundidade > MAX_DEPTH) {
    throw new TemplatesValidationError(
      `'templates' excede a profundidade máxima permitida (${MAX_DEPTH}) em "${caminho}".`
    );
  }

  if (typeof valor === "string") {
    if (valor.length > MAX_STRING_LENGTH) {
      throw new TemplatesValidationError(
        `String em "${caminho}" excede o tamanho máximo de ${MAX_STRING_LENGTH} caracteres.`
      );
    }
    return;
  }

  if (typeof valor === "number" || typeof valor === "boolean" || valor === null) {
    return;
  }

  if (Array.isArray(valor)) {
    if (valor.length > MAX_ARRAY_LENGTH) {
      throw new TemplatesValidationError(
        `Array em "${caminho}" excede o tamanho máximo de ${MAX_ARRAY_LENGTH} itens.`
      );
    }
    valor.forEach((item, i) =>
      validarNo(item, `${caminho}[${i}]`, profundidade + 1, contador)
    );
    return;
  }

  if (isPlainObject(valor)) {
    const chaves = Object.keys(valor);
    if (chaves.length > MAX_OBJECT_KEYS) {
      throw new TemplatesValidationError(
        `Objeto em "${caminho}" excede o número máximo de chaves (${MAX_OBJECT_KEYS}).`
      );
    }
    for (const chave of chaves) {
      if (CHAVE_PERIGOSA.has(chave)) {
        throw new TemplatesValidationError(
          `Chave não permitida em "${caminho}": "${chave}".`
        );
      }
      validarNo(valor[chave], `${caminho}.${chave}`, profundidade + 1, contador);
    }
    return;
  }

  throw new TemplatesValidationError(
    `Tipo de valor não suportado em "${caminho}".`
  );
}

/**
 * Valida a forma estrutural (tamanho, profundidade, chaves) do campo
 * `templates` recebido no body de POST /api/calcular, antes de ele chegar a
 * `calcularEngine`/`resolveTemplate`. Lança `TemplatesValidationError`
 * (tratável pelo chamador como HTTP 400) quando o payload é malformado,
 * grande ou profundo demais, ou contém chaves perigosas.
 *
 * `templates` ausente (undefined) é válido — nesse caso o motor usa a
 * Biblioteca de Engenharia padrão do servidor.
 */
export function validarTemplatesBody(templates: unknown): void {
  if (templates === undefined) return;

  if (!isPlainObject(templates)) {
    throw new TemplatesValidationError("Campo 'templates' deve ser um objeto.");
  }

  const chaves = Object.keys(templates);
  if (chaves.length > MAX_TEMPLATES) {
    throw new TemplatesValidationError(
      `'templates' excede o número máximo de entradas (${MAX_TEMPLATES}).`
    );
  }

  const contador = { total: 0 };
  validarNo(templates, "templates", 0, contador);
}
