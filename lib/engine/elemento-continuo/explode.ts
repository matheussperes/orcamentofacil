import type { ItemQtd, Peca } from "../types";
import type { BoxMaterial } from "../box/types";
import type { Placa } from "../placa/types";
import { explodePlaca } from "../placa/explode";
import {
  POSICOES_VALIDAS,
  type AlvoResolvido,
  type ElementoContinuo,
  type ModuloResolvido,
} from "./types";

// Explosão geométrica do Elemento Contínuo unificado (Modelo de Domínio,
// Seção 3.4/3.5/3.6; Task 12.4). Mesmo padrão de `lib/engine/placa/explode.ts`
// e `lib/engine/box/explode.ts`: funções puras, helper `push` que ignora
// dimensões ≤ 0, `Peca[]` de saída, `round4`.
//
// A2 = A-07 (Seção 10 do Modelo de Domínio): "Fechamento/Rodapé: '50mm'/
// '150mm' são largura/altura; a espessura é sempre a do material". Isso
// resolve uma ambiguidade real: a tabela da Seção 3.4 lista 3 valores
// (largura/profundidade/altura) por elemento, mas `Peca` só tem 2 dimensões
// de face + espessura. Pra Rodapé e Fechamento, o valor da coluna
// "Altura/Espessura" (150mm/50mm) é confirmado como dimensão de FACE real
// (não espessura de chapa) — isso só fecha a conta se a "profundidade" do
// Rodapé (e a "profundidade" ausente do Fechamento) NÃO for uma dimensão de
// corte da peça, e sim metadado de posicionamento/recuo (análogo ao
// RECUO_RODAPE já existente em `ParametrosFabrica`). Essa leitura também bate
// com a peça "Rodapé Frontal" já existente em `lib/engine/box/explode.ts`
// (`push(ctx, "Rodapé Frontal", 1, caixa, "caixa", RODAPE_H, larguraInterna, 0, 1)`
// — só altura×largura, sem profundidade). Decisão documentada: as funções de
// derivação abaixo EXPÕEM os 3 valores da tabela (pro chamador/UI, e porque o
// enunciado da task pede o teste desses 3 valores), mas a explosão em peça só
// consome os 2 que são dimensão de corte real.

const RODAPE_ALTURA_PADRAO = 150; // mm (Seção 3.4)
const FECHAMENTO_LARGURA_SARRAFO_PADRAO = 50; // mm (Seção 3.4)
const TAMPONAMENTO_EXTRA = 25; // mm — "inteiro": profundidade do módulo + 25mm (Seção 3.5)
const TAMPONAMENTO_SARRAFO_PROFUNDIDADE = 70; // mm fixo — "sarrafo" (Seção 3.5)

export interface ElementoContinuoResult {
  pecas: Peca[];
  ferragens: ItemQtd[];
  areaMdfM2: number;
  fitaM: number;
}

/** Lança se `elemento.posicao` não é válida pro `elemento.tipo` (Seção 3.4,
 * tabela "Posições válidas por tipo"). Decisão de design: `throw Error`, não
 * `EngineWarning` — mesmo padrão de `validarNivelEspessuraBase` em
 * `lib/engine/placa/explode.ts`: é um invariante estrutural (combinação
 * inválida que não deveria existir), não uma validação "soft" de layout pra
 * exibir na UI sem travar o cálculo (esse é o uso que `EngineWarning` tem em
 * `lib/engine/parede/validar.ts` — overlaps, fora dos limites da parede etc.,
 * casos onde faz sentido reportar vários problemas de uma vez e seguir
 * calculando). Aqui não há "vários" — ou a posição é válida, ou o elemento
 * não pode ser explodido; falha rápida é mais seguro.
 */
export function validarPosicao(elemento: ElementoContinuo): void {
  const validas = POSICOES_VALIDAS[elemento.tipo];
  if (!validas.includes(elemento.posicao)) {
    throw new Error(
      `Elemento Contínuo tipo "${elemento.tipo}" não aceita posição "${elemento.posicao}" ` +
        `(válidas: ${validas.join(", ")}).`
    );
  }
}

function larguraTotal(itens: ModuloResolvido[]): number {
  return itens.reduce((s, i) => s + i.largura, 0);
}
function profundidadeMaxima(itens: ModuloResolvido[]): number {
  return Math.max(...itens.map((i) => i.profundidade));
}
function alturaMaxima(itens: ModuloResolvido[]): number {
  return Math.max(...itens.map((i) => i.altura));
}

// ---- Tampo (Seção 3.4) ----

export interface DimensoesTampo {
  largura: number;
  profundidade: number;
}

/**
 * Largura = soma das larguras dos módulos do bloco (ou a largura do módulo
 * isolado, se `itens` tiver 1 item). Profundidade = MAIOR profundidade dos
 * módulos do bloco + 30mm (A-06, Seção 10 — "se o bloco variar de
 * profundidade, usa o maior"). `override` sobrescreve qualquer um dos dois
 * quando presente — a spec só chama Rodapé/Fechamento explicitamente de
 * "editáveis", mas nada proíbe Tampo, e o campo `override` é compartilhado
 * pelos 4 tipos no tipo de referência (Seção 3.4); único tipo com exclusão
 * EXPLÍCITA de override é Tamponamento (Seção 3.5). Decisão de design
 * documentada.
 */
export function derivarDimensoesTampo(itens: ModuloResolvido[], elemento: ElementoContinuo): DimensoesTampo {
  return {
    largura: elemento.override?.largura ?? larguraTotal(itens),
    profundidade: elemento.override?.profundidade ?? profundidadeMaxima(itens) + 30,
  };
}

function explodeTampo(elemento: ElementoContinuo, itens: ModuloResolvido[]): ElementoContinuoResult {
  const { largura, profundidade } = derivarDimensoesTampo(itens, elemento);

  // Reaproveita `explodePlaca` (Task 12.1) pra engrossamento/dobra — mesma
  // regra, mesma função, sem reimplementar. `Placa.altura` é só "dimensão de
  // face" (sem semântica de altura de móvel — ver comentário em
  // `lib/engine/placa/types.ts`), aqui carrega a profundidade do tampo.
  // `orientacao` é campo obrigatório de `Placa` mas não é lido por
  // `explodePlaca` (não influencia o cálculo) — valor arbitrário documentado.
  const placa: Placa = {
    id: elemento.id,
    nome: "Tampo",
    largura,
    altura: profundidade,
    material: elemento.material,
    orientacao: "horizontal",
    engrossamento: elemento.engrossamento,
  };

  const r = explodePlaca(placa);
  return { pecas: r.pecas, ferragens: [], areaMdfM2: r.areaMdfM2, fitaM: r.fitaM };
}

// ---- Rodapé (Seção 3.4) ----

export interface DimensoesRodape {
  largura: number;
  profundidade: number;
  altura: number;
}

/**
 * Largura = largura total do bloco − 30mm. Altura = 150mm (padrão). Ambos são
 * dimensão de corte real da peça (ver nota A-07 no topo do arquivo).
 * Profundidade = MAIOR profundidade dos módulos do bloco − 130mm — exposta
 * aqui porque a tabela da Seção 3.4 a lista explicitamente e a task pede o
 * teste desse valor, mas NÃO alimenta a peça gerada (é metadado de
 * recuo/posicionamento, não dimensão de corte — ver nota A-07). Generalização
 * de A-06 (que fala só de Tampo) pro caso de bloco com profundidades
 * variadas: mesma regra ("usa o maior"), por consistência física (rodapé
 * corre no piso ao longo do bloco inteiro, mesma situação do tampo) — decisão
 * de design sem exemplo numérico na spec, documentada.
 */
export function derivarDimensoesRodape(itens: ModuloResolvido[], elemento: ElementoContinuo): DimensoesRodape {
  return {
    largura: elemento.override?.largura ?? larguraTotal(itens) - 30,
    profundidade: elemento.override?.profundidade ?? profundidadeMaxima(itens) - 130,
    altura: elemento.override?.altura ?? RODAPE_ALTURA_PADRAO,
  };
}

function explodeRodape(elemento: ElementoContinuo, itens: ModuloResolvido[]): ElementoContinuoResult {
  const { largura, altura } = derivarDimensoesRodape(itens, elemento);
  const pecas: Peca[] = [];
  push(pecas, "Rodapé", 1, elemento.material, altura, largura);
  return { pecas, ferragens: [], areaMdfM2: areaTotal(pecas), fitaM: 0 };
}

// ---- Fechamento (Seção 3.4) ----

export interface DimensoesFechamento {
  comprimento: number; // largura total (posição "superior") ou altura total (lateral)
  larguraSarrafo: number; // 50mm padrão
}

/**
 * 1 sarrafo na medida total do bloco: largura total dos módulos (posição
 * "superior") ou MAIOR altura dos módulos (posições "esquerda"/"direita" —
 * mesma generalização de A-06 usada em Rodapé, pelo mesmo motivo: não há
 * exemplo numérico da spec pra bloco de alturas variadas, mas a leitura mais
 * consistente é "usa o maior"). Largura do sarrafo = 50mm padrão.
 * Mapeamento de `override` (campos compartilhados largura/profundidade/altura
 * do tipo de referência) pros 2 valores reais de Fechamento: `override.largura`
 * → `comprimento` (é o valor que ocupa a coluna "Largura" da tabela da Seção
 * 3.4); `override.altura` → `larguraSarrafo` (ocupa a coluna "Altura/
 * Espessura", mesmo esquema de Rodapé — A-07). `override.profundidade` não
 * se aplica (Fechamento não tem profundidade, tabela mostra "—") e é ignorado.
 */
export function derivarDimensoesFechamento(
  itens: ModuloResolvido[],
  elemento: ElementoContinuo
): DimensoesFechamento {
  const ehLateral = elemento.posicao === "esquerda" || elemento.posicao === "direita";
  const comprimentoPadrao = ehLateral ? alturaMaxima(itens) : larguraTotal(itens);
  return {
    comprimento: elemento.override?.largura ?? comprimentoPadrao,
    larguraSarrafo: elemento.override?.altura ?? FECHAMENTO_LARGURA_SARRAFO_PADRAO,
  };
}

function explodeFechamento(elemento: ElementoContinuo, itens: ModuloResolvido[]): ElementoContinuoResult {
  const { comprimento, larguraSarrafo } = derivarDimensoesFechamento(itens, elemento);
  const pecas: Peca[] = [];
  // Convenção já usada pros sarrafos de tamponamento estrutural em
  // lib/engine/box/explode.ts: altura_mm = comprimento (eixo que corre
  // inteiro), largura_mm = largura do próprio sarrafo.
  push(pecas, "Fechamento", 1, elemento.material, comprimento, larguraSarrafo);
  return { pecas, ferragens: [], areaMdfM2: areaTotal(pecas), fitaM: 0 };
}

// ---- Tamponamento (Seção 3.5) — única exceção sem override ----

export interface DimensoesTamponamento {
  altura: number; // ou largura do módulo, se posição base/topo (mudança de eixo, Seção 3.5)
  profundidade: number;
}

/**
 * Deriva do módulo da EXTREMIDADE (já resolvido pelo chamador — ver
 * `AlvoResolvido` em types.ts), NUNCA do bloco inteiro. `override` do
 * `elemento` é IGNORADO por completo, mesmo se presente — Seção 3.5 é
 * explícita: "as dimensões continuam estritamente derivadas e não digitáveis
 * ... é a exceção". Posições esquerda/direita: altura = altura do módulo da
 * extremidade. Posições base/topo: o elemento corre na horizontal — a mesma
 * dimensão vira a LARGURA do módulo da extremidade (mesma regra, eixo
 * diferente). Profundidade: "inteiro" → profundidade do módulo + 25mm;
 * "sarrafo" → 70mm fixo, independente da profundidade do módulo.
 */
export function derivarDimensoesTamponamento(
  moduloExtremidade: ModuloResolvido,
  elemento: ElementoContinuo
): DimensoesTamponamento {
  const eixoVertical = elemento.posicao === "esquerda" || elemento.posicao === "direita";
  const altura = eixoVertical ? moduloExtremidade.altura : moduloExtremidade.largura;
  const profundidade =
    elemento.tamponamentoTipo === "sarrafo"
      ? TAMPONAMENTO_SARRAFO_PROFUNDIDADE
      : moduloExtremidade.profundidade + TAMPONAMENTO_EXTRA;
  return { altura, profundidade };
}

function explodeTamponamento(elemento: ElementoContinuo, moduloExtremidade: ModuloResolvido): ElementoContinuoResult {
  const { altura, profundidade } = derivarDimensoesTamponamento(moduloExtremidade, elemento);
  const pecas: Peca[] = [];
  const nome = `Tamponamento (${elemento.tamponamentoTipo ?? "inteiro"})`;
  push(pecas, nome, 1, elemento.material, altura, profundidade);
  return { pecas, ferragens: [], areaMdfM2: areaTotal(pecas), fitaM: 0 };
}

// ---- Dispatcher ----

export function explodeElementoContinuo(elemento: ElementoContinuo, alvo: AlvoResolvido): ElementoContinuoResult {
  validarPosicao(elemento);

  switch (elemento.tipo) {
    case "tampo":
      return explodeTampo(elemento, itensDoAlvo(alvo, elemento.tipo));
    case "rodape":
      return explodeRodape(elemento, itensDoAlvo(alvo, elemento.tipo));
    case "fechamento":
      return explodeFechamento(elemento, itensDoAlvo(alvo, elemento.tipo));
    case "tamponamento":
      return explodeTamponamento(elemento, moduloDoAlvo(alvo));
    default: {
      const exaustivo: never = elemento.tipo;
      throw new Error(`Tipo de Elemento Contínuo desconhecido: ${String(exaustivo)}`);
    }
  }
}

function itensDoAlvo(alvo: AlvoResolvido, tipo: string): ModuloResolvido[] {
  if (!("itens" in alvo)) {
    throw new Error(`Elemento Contínuo tipo "${tipo}" precisa de um alvo resolvido com "itens" (bloco/módulo).`);
  }
  return alvo.itens;
}

function moduloDoAlvo(alvo: AlvoResolvido): ModuloResolvido {
  if (!("moduloExtremidade" in alvo)) {
    throw new Error(`Elemento Contínuo tipo "tamponamento" precisa de um alvo resolvido com "moduloExtremidade".`);
  }
  return alvo.moduloExtremidade;
}

// ---- Helpers (mesmo padrão de lib/engine/placa/explode.ts) ----

function push(pecas: Peca[], nome: string, quantidade: number, material: BoxMaterial, altura: number, largura: number) {
  if (quantidade <= 0 || altura <= 0 || largura <= 0) return;
  pecas.push({
    nome,
    quantidade,
    // Sem valor dedicado no enum `MaterialTipo` pra "elemento contínuo avulso"
    // (mesma lacuna documentada em lib/engine/placa/explode.ts) — "prateleira"
    // é o mais próximo semanticamente (peça plana solta) e não alimenta
    // lógica alguma hoje (só rótulo, ver lib/engine/consolidar.ts).
    material_tipo: "prateleira",
    cor: material.cor,
    espessura_mm: material.espessura,
    altura_mm: Math.round(altura),
    largura_mm: Math.round(largura),
    area_m2: round4((altura * largura * quantidade) / 1e6),
    // Fita de borda por espessura final é regra de catálogo (Seção 2.1) — fora
    // de escopo (pricing/catálogo), mesma decisão de Placa.
    fita_m: 0,
    // Veio de chapa (Seção 8, Task 12.5): Elemento Contínuo também não tem
    // UI/editor pra escolher o sentido ainda (Fase C / Stage 13) — mesmo
    // PLACEHOLDER documentado de lib/engine/placa/explode.ts: herda
    // `temVeio` do material real, sentido default "comprimento".
    temVeio: material.temVeio ?? false,
    sentidoVeio: "comprimento",
  });
}

function areaTotal(pecas: Peca[]): number {
  return round4(pecas.reduce((s, p) => s + p.area_m2, 0));
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
