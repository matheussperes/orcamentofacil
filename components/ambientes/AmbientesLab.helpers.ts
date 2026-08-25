// Task R.3a — funções puras extraídas de AmbientesLab.tsx (decomposição
// pura, sem mudança de comportamento). Sem JSX, sem hooks — testáveis sem
// jsdom (ver AmbientesLab.test.ts).
import type { AlturasFaixas, ElementoParede } from "@/lib/engine/parede";
import { canonicoParaValor, valorParaCanonico, type ReferenciaX, type ReferenciaY } from "@/lib/engine/parede/referenciaMedida";
import type { SelecaoTampo } from "@/lib/engine/elemento-continuo/types";
import { OPCOES_ESPESSURA_ENGROSSAMENTO } from "@/lib/engine/elemento-continuo/types";
import type { Engrossamento } from "@/lib/engine/placa/types";
import type { ElementoParedePresetRow } from "@/lib/elemento-parede-preset/tipos";
import { ambienteInicial, type AmbienteItem, type ParedeComMeta } from "@/lib/ambiente/estado";
import type { LinhaProposta, TagComercial } from "@/lib/linha-proposta/tipos";
import type { SelecaoAlvo } from "./AmbientesLab.types";

/** Recalcula o valor EXIBIDO ao trocar refX/refY, preservando o canônico —
 * trocar a referência sozinha nunca move o elemento (Modelo de Domínio
 * 3.2.2). Extraída como função pura pra ser testável sem jsdom (este
 * projeto não tem ambiente de render — mesmo motivo de `ElevacaoParede.tsx`
 * só exportar a geometria pura, ver `ElevacaoParede.test.ts`). */
export function recalcularValorAoTrocarRef<R extends ReferenciaX | ReferenciaY>(
  valorAtual: number,
  refAtual: R,
  refNova: R,
  dimensaoTotal: number,
  tamanhoElemento: number
): number {
  const canonico = valorParaCanonico(valorAtual, refAtual, dimensaoTotal, tamanhoElemento);
  return canonicoParaValor(canonico, refNova, dimensaoTotal, tamanhoElemento);
}

/** Substitui o elemento no índice em edição, ou adiciona ao final quando não
 * há edição em curso — a mesma função cobre os dois caminhos (lista/clique
 * no 2D) porque os dois convergem no mesmo estado `elementoEditandoIndice`. */
export function salvarElementoNaLista(
  elementos: ElementoParede[],
  elemento: ElementoParede,
  indiceEditando: number | null
): ElementoParede[] {
  if (indiceEditando === null) return [...elementos, elemento];
  const copia = [...elementos];
  copia[indiceEditando] = elemento;
  return copia;
}

/** Task 2.12 (front) — campos do formulário de "adicionar elemento" após
 * aplicar um preset (Modelo de Domínio 3.2.3: cópia, sem vínculo vivo —
 * `larguraPadrao`/`alturaPadrao` são opcionais, mantém o valor atual do
 * formulário quando ausentes). Extraída como função pura pra ser testável
 * sem jsdom, mesmo motivo de `salvarElementoNaLista`. */
export function aplicarPresetElementoParede(
  campoAtual: { novaLargura: number; novaAltura: number },
  preset: ElementoParedePresetRow
): { novoNome: string; novaLargura: number; novaAltura: number } {
  return {
    novoNome: preset.nome,
    novaLargura: preset.larguraPadrao ?? campoAtual.novaLargura,
    novaAltura: preset.alturaPadrao ?? campoAtual.novaAltura,
  };
}

/** Task 3.10–3.11 (front) — monta `ElementoContinuo.engrossamento` a partir da
 * seleção de modelo/espessura do tampo (Modelo-de-Dominio Seção 3.4.1/2.1).
 * Extraída como função pura pra ser testável sem jsdom, mesmo motivo de
 * `salvarElementoNaLista`. "simples" → `undefined`; "engrossado"/"dobrado" →
 * localiza a combinação base+nível em `OPCOES_ESPESSURA_ENGROSSAMENTO` pela
 * espessura final escolhida (sempre encontra, se `espessuraFinal` já foi
 * validado pelo Select — nunca 15/18/25, que só existem no modelo simples).
 * Lados/largura de sarrafo: default de 4 lados e 70mm (decisão de escopo
 * desta task, ver contrato — sem seletor visual de lados). */
export function montarEngrossamentoTampo(selecao: SelecaoTampo): Engrossamento | undefined {
  if (selecao.modelo === "simples") return undefined;
  const opcao = OPCOES_ESPESSURA_ENGROSSAMENTO.find((o) => o.espessuraFinal === selecao.espessuraFinal);
  if (!opcao) return undefined;
  return selecao.modelo === "engrossado"
    ? { tecnica: "engrossada", nivel: opcao.nivel, lados: ["superior", "inferior", "esquerda", "direita"], larguraSarrafo: 70 }
    : { tecnica: "dobrada", nivel: opcao.nivel };
}

/** Grava um campo de altura customizado no override, preservando os demais.
 * Extraída como função pura pra ser testável sem jsdom, mesmo motivo de
 * `salvarElementoNaLista`. */
export function definirAlturaOverride(
  overrides: Partial<AlturasFaixas> | undefined,
  campo: keyof AlturasFaixas,
  valor: number
): Partial<AlturasFaixas> {
  return { ...overrides, [campo]: valor };
}

/** "Voltar ao herdado": apaga a chave do override (nunca copia o valor
 * numérico do perfil) — Modelo de Domínio 3.2.1. Preserva os demais campos
 * do override. */
export function removerAlturaOverride(
  overrides: Partial<AlturasFaixas> | undefined,
  campo: keyof AlturasFaixas
): Partial<AlturasFaixas> {
  const resto = { ...overrides };
  delete resto[campo];
  return resto;
}

// Task 13.3c: ids gerados por timestamp+random (não um contador incremental
// em variável de módulo) — evita colisão com ids já persistidos (duas
// "instancia-1" diferentes) entre sessões/orçamentos. Mesma convenção de
// `lib/boxPresets.ts`.
export function novoItemId(): string {
  return `instancia-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
export function novoElementoId(): string {
  return `elemento-continuo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
// Task 2.3-2.6 — id local de ambiente/parede quando NÃO há `onMutarAmbientes`
// (harness/laboratório, sem Supabase real — `aplicarComandoAmbiente` roda em
// memória). `AmbientesTabConectada` nunca cai neste caminho: lá o id real
// vem do banco via `lib/ambiente/mutar.ts`.
export function novoIdLocal(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Aplica um movimento ↑/↓ numa lista de ids (ordem de exibição = ordem do
 * array) — swap com o vizinho, sem efeito nas pontas. Pura, testável sem
 * jsdom (mesmo motivo de `salvarElementoNaLista` acima). */
export function moverIdNaLista(ids: string[], id: string, direcao: "cima" | "baixo"): string[] {
  const indice = ids.indexOf(id);
  const alvo = direcao === "cima" ? indice - 1 : indice + 1;
  if (indice === -1 || alvo < 0 || alvo >= ids.length) return ids;
  const copia = [...ids];
  [copia[indice], copia[alvo]] = [copia[alvo], copia[indice]];
  return copia;
}

export function chaveSelecao(s: SelecaoAlvo | null): string {
  if (!s) return "";
  return s.tipo === "conjunto" ? `conjunto:${s.conjuntoId}` : `item:${s.itemId}`;
}

export function numero(valor: string): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/** Estado inicial de ambientes sempre não-vazio na entrada de `AmbientesLab`
 * — `carregarEstadoAmbiente`/`estadoAmbientePadrao` já garantem isso, mas um
 * blob de localStorage salvo por uma sessão anterior à Task 2.3-2.6 (ainda no
 * formato singular `parede`) cai em `parsed.ambientes ?? padrao.ambientes`
 * (`persistenciaLocal.ts`) — nunca em array vazio de verdade, mas o guarda
 * abaixo é a rede de segurança pra nunca indexar `[0]` de um array vazio. */
export function ambientesGarantidos(ambientes: AmbienteItem[]): AmbienteItem[] {
  return ambientes.length > 0 ? ambientes : [ambienteInicial()];
}

/** Substitui, dentro da lista de ambientes, a parede identificada por
 * `ambienteId`/`paredeAtualizada.id` pelo objeto informado — usada tanto para
 * gravar de volta a edição em progresso da parede selecionada (troca de
 * seleção, "Salvar alterações") quanto para reconciliar com a árvore fresca
 * devolvida por um comando de CRUD imediato. */
export function substituirParedeNaLista(
  ambientes: AmbienteItem[],
  ambienteId: string,
  paredeAtualizada: ParedeComMeta
): AmbienteItem[] {
  return ambientes.map((a) =>
    a.id !== ambienteId
      ? a
      : { ...a, paredes: a.paredes.map((p) => (p.id === paredeAtualizada.id ? paredeAtualizada : p)) }
  );
}

export function encontrarParede(
  ambientes: AmbienteItem[],
  ambienteId: string,
  paredeId: string
): ParedeComMeta | undefined {
  return ambientes.find((a) => a.id === ambienteId)?.paredes.find((p) => p.id === paredeId);
}

/** Aplica o remapeamento de ids sentinela → ids reais devolvido por
 * `salvarEstadoAmbiente` no bootstrap do orçamento novo (ver
 * `ResultadoSalvarAmbiente.idsRemapeados`) — pura, testável sem jsdom. */
export function remapearIdsAmbientes(
  ambientes: AmbienteItem[],
  idsRemapeados: { ambientes: Record<string, string>; paredes: Record<string, string> }
): AmbienteItem[] {
  return ambientes.map((a) => ({
    ...a,
    id: idsRemapeados.ambientes[a.id] ?? a.id,
    paredes: a.paredes.map((p) => ({ ...p, id: idsRemapeados.paredes[p.id] ?? p.id })),
  }));
}

/** Task 2.28-2.30 (RF-37/Q-3) — mapa itemId -> Linha de Proposta a que
 * pertence, consumido pelo badge comercial somente-leitura de
 * `ElevacaoParede`/`BoxCanvas` (modo conjunto). Regra de ruído do contrato:
 * com 0 ou 1 linha (o default D-17, que cobre todos os itens do ambiente),
 * o badge seria redundante em 100% dos itens — mapa fica vazio e nenhum
 * badge é desenhado. Só a partir de 2+ linhas o agrupamento comercial
 * carrega informação nova em relação ao Conjunto físico. */
export function derivarTagsComerciais(linhasProposta: LinhaProposta[]): Map<string, TagComercial> {
  const mapa = new Map<string, TagComercial>();
  if (linhasProposta.length <= 1) return mapa;
  for (const linha of linhasProposta) {
    for (const itemId of linha.itens) {
      mapa.set(itemId, { linhaId: linha.id, titulo: linha.titulo });
    }
  }
  return mapa;
}

