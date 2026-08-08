"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BoxCanvas, type ItemDoConjunto } from "@/app/components/BoxCanvas";
import { ElevacaoParede } from "./ElevacaoParede";
import { SeletorLista } from "./SeletorLista";
import {
  calcularVizinhos,
  converterVaoParaX,
  converterXParaVao,
  validarParedeTier1,
  validarParedeTier2,
  type AlturasFaixas,
  type ElementoParede,
  type Faixa,
  type ItemPosicionado,
  type Parede,
  type ReferenciaVao,
  type ResolvedorItens,
} from "@/lib/engine/parede";
import { aplicarOverrides, detectarConjuntos, type Conjunto, type OverrideJuncao } from "@/lib/engine/conjunto";
import {
  canonicoParaValor,
  valorParaCanonico,
  type ReferenciaX,
  type ReferenciaY,
} from "@/lib/engine/parede/referenciaMedida";
import type { EngineWarning } from "@/lib/engine/types";
import {
  calcularOrcamentoMisto,
  idDoItem,
  larguraDoItem,
  type ElementoContinuoResolvido,
  type ModuloOrcamento,
} from "@/lib/orcamento";
import { MATERIAIS_PADRAO, PARAMETROS_FABRICA_PADRAO } from "@/lib/engine/defaults";
import type { BoxMaterial, BoxModule, TipoPuxador } from "@/lib/engine/box/types";
import {
  POSICOES_VALIDAS,
  type AlvoElementoContinuo,
  type ElementoContinuo,
  type PosicaoElemento,
  type TipoElementoContinuo,
} from "@/lib/engine/elemento-continuo/types";
import { listarPresets, seedPresetsPadrao, type BoxPreset } from "@/lib/boxPresets";
import { carregarCatalogo, coresDisponiveis, espessurasDaCor, type Catalogo } from "@/lib/catalog";
import {
  ambienteInicial,
  aplicarComandoAmbiente,
  type AmbienteItem,
  type ComandoAmbiente,
  type EstadoAmbiente,
  type ParedeComMeta,
  type ResultadoMutarAmbientes,
  type ResultadoSalvarAmbiente,
} from "@/lib/ambiente/estado";
import { resolverAlvoElemento } from "@/lib/ambiente/resolverAlvo";
import { criarElementoParedePreset } from "@/lib/elemento-parede-preset/criar";
import { excluirElementoParedePreset } from "@/lib/elemento-parede-preset/excluir";
import type { ElementoParedePresetRow } from "@/lib/elemento-parede-preset/tipos";

// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md) — refatoração para
// componente PRESENTACIONAL: recebe o estado profundo de Ambientes (parede,
// alturas, módulos posicionados, elementos contínuos, overrides de junção)
// via prop `estadoInicial` e devolve mudanças via `onSalvar` (chamado só
// quando o usuário clica em "Salvar alterações" — nunca autosave). Este
// componente NÃO SABE de onde o estado veio nem para onde `onSalvar` grava —
// pode ser Supabase (`AmbientesTabConectada`, `/orcamento/[id]`), localStorage
// (`AmbientesLabStandalone`, laboratório `/ambientes`) ou nada
// (`AmbientesTabMock`, harness `/dev/preview/orcamento`). É exatamente essa
// indiferença que mantém o harness funcionando sem sessão/Supabase reais.
//
// Diferença de escopo em relação à Task 13.3c: o estado profundo deixou de
// viver em localStorage próprio deste componente (removido — ver relatório
// da 13.3d sobre o que aconteceu com a chave `ambientes:<chavePrefixo>:
// estado`). Também mudou o formato de "itens posicionados": não existe mais
// `ItemColocado` (itemId+presetId+x+faixa) — agora `modulos` guarda o
// `ModuloOrcamento[]` REAL copiado do preset no momento de posicionar (com o
// itemId de instância), e `parede.itens` (`ItemPosicionado[]`) guarda só as
// posições que referenciam esses itemIds. O nome exibido de um item
// posicionado vem do próprio módulo (`box.nome`/`placa.nome`), não mais de um
// lookup em `presets` por `presetId`.

const TIPOS_ELEMENTO: ElementoParede["tipo"][] = ["janela", "porta", "tomada", "ponto_hidraulico", "pedra"];
const ROTULO_TIPO_ELEMENTO: Record<ElementoParede["tipo"], string> = {
  janela: "Janela",
  porta: "Porta",
  tomada: "Tomada",
  ponto_hidraulico: "Ponto hidráulico",
  pedra: "Pedra",
};

// Modelo de Domínio 3.2.2 ([V2.1] itens 2.9/2.11) — rótulos exatos, nunca
// "X"/"Y" na tela.
const ROTULO_REF_X: Record<ReferenciaX, string> = {
  esquerda: "Distância da parede esquerda",
  direita: "Distância da parede direita",
};
const ROTULO_REF_Y: Record<ReferenciaY, string> = {
  chao: "Altura do chão",
  teto: "Distância do teto",
};

// Task 2.18 (front) — mesmo espírito de nomenclatura acima, mas para o vão
// até o vizinho (Modelo de Domínio 3.1.1), não a distância até a parede.
const ROTULO_REF_VAO: Record<ReferenciaVao, string> = {
  esquerda: "Distância do vizinho à esquerda",
  direita: "Distância do vizinho à direita",
};

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

const FAIXAS: Faixa[] = ["inferior", "bancada", "aereo", "torre"];
const ROTULO_FAIXA: Record<Faixa, string> = {
  inferior: "Inferior",
  bancada: "Bancada",
  aereo: "Aéreo",
  torre: "Torre",
};

// Task 13.3c: ids gerados por timestamp+random (não um contador incremental
// em variável de módulo) — evita colisão com ids já persistidos (duas
// "instancia-1" diferentes) entre sessões/orçamentos. Mesma convenção de
// `lib/boxPresets.ts`.
function novoItemId(): string {
  return `instancia-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function novoElementoId(): string {
  return `elemento-continuo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
// Task 2.3-2.6 — id local de ambiente/parede quando NÃO há `onMutarAmbientes`
// (harness/laboratório, sem Supabase real — `aplicarComandoAmbiente` roda em
// memória). `AmbientesTabConectada` nunca cai neste caminho: lá o id real
// vem do banco via `lib/ambiente/mutar.ts`.
function novoIdLocal(): string {
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

// Task 13.2c — painel lateral de Elemento Contínuo. Rótulos de exibição.
const ROTULO_TIPO_ELEMENTO_CONTINUO: Record<TipoElementoContinuo, string> = {
  tampo: "Tampo",
  rodape: "Rodapé",
  tamponamento: "Tamponamento",
  fechamento: "Fechamento",
};
const ROTULO_POSICAO_ELEMENTO: Record<PosicaoElemento, string> = {
  superior: "Superior",
  base: "Base",
  esquerda: "Esquerda",
  direita: "Direita",
  topo: "Topo",
};

// Alvo de seleção do painel: um Conjunto (bloco) detectado/ajustado (Task
// 13.2b) ou um item avulso (não pertence a nenhum Conjunto).
type SelecaoAlvo = { tipo: "conjunto"; conjuntoId: string } | { tipo: "item"; itemId: string };

function chaveSelecao(s: SelecaoAlvo | null): string {
  if (!s) return "";
  return s.tipo === "conjunto" ? `conjunto:${s.conjuntoId}` : `item:${s.itemId}`;
}

function numero(valor: string): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

// Task 2.3-2.6 (alturas) — os 4 campos de altura de faixa (Modelo-de-Domínio
// Seção 3.2.1), na mesma ordem já usada pelo card "Alturas do perfil".
const CAMPOS_ALTURA: { campo: keyof AlturasFaixas; rotulo: string; id: string }[] = [
  { campo: "alturaRodape", rotulo: "Rodapé (mm)", id: "override-altura-rodape" },
  { campo: "alturaBancada", rotulo: "Bancada (mm)", id: "override-altura-bancada" },
  { campo: "alturaInstalacaoAereo", rotulo: "Instalação aéreo (mm)", id: "override-altura-aereo" },
  { campo: "peDireito", rotulo: "Pé-direito (mm)", id: "override-pe-direito" },
];

export interface AmbientesLabProps {
  /** Estado inicial (carregado pelo dono de I/O — Supabase, localStorage ou
   * mock). Só é lido na PRIMEIRA renderização (inicializador preguiçoso do
   * `useState`, mesmo padrão já usado pelos overrides na Task 13.2b) — trocar
   * a prop depois de montado não reseta o estado em edição. */
  estadoInicial: EstadoAmbiente;
  /** Chamado só quando o usuário clica em "Salvar alterações" — NUNCA
   * autosave. Quem implementa decide o destino (Supabase, localStorage,
   * no-op) e como reporta sucesso/erro. */
  onSalvar: (estado: EstadoAmbiente) => Promise<ResultadoSalvarAmbiente>;
  /** Id do orçamento pai — só existe quando este `AmbientesLab` está
   * conectado a um orçamento real (`AmbientesTabConectada`, Task 13.3d).
   * Task 13.3e: quando presente, cada linha de "Itens posicionados" ganha um
   * link "Editar item" pra `/orcamento/[id]/item/[itemId]` (o Editor de Item
   * completo — accordion Caixa/Divisões/Portas/Gavetas/Puxador ou seções de
   * Placa). Ausente em `AmbientesLabStandalone` (`/ambientes`, sem
   * orçamento pai — não há pra onde linkar) e em `AmbientesTabMock` (harness
   * `/dev/preview/orcamento`, sem `orcamentoId`/`itemId` reais que resolvam
   * numa rota que funcione) — decisão de menor esforço documentada no
   * relatório da 13.3e. */
  orcamentoId?: string;
  /** Task 2.3-2.6 — CRUD imediato (criar/renomear/excluir/reordenar) de
   * ambiente/parede: NUNCA autosave, mas também nunca espera o botão
   * "Salvar alterações" (que continua só para o conteúdo profundo — elementos/
   * itens de cada parede). Ausente em `AmbientesLabStandalone`/`AmbientesTabMock`
   * (sem `orcamentoId`/Supabase real) — nesse caso `AmbientesLab` aplica o
   * comando em memória via `aplicarComandoAmbiente` (`lib/ambiente/estado.ts`),
   * mesma função pura usada como referência de comportamento pelos dois
   * caminhos. */
  onMutarAmbientes?: (comando: ComandoAmbiente) => Promise<ResultadoMutarAmbientes>;
  /** Presets de elemento de parede da organização (Task 2.12, Modelo de
   * Domínio 3.2.3), carregados server-side por quem monta este componente
   * (`AmbientesTabConectada`/`app/(app)/orcamento/[id]/page.tsx`) — só
   * existe onde há Supabase real. Ausente em `AmbientesLabStandalone`
   * (`/ambientes`) e `AmbientesTabMock` (harness), que não recebem esta
   * prop: a UI de preset fica vazia/oculta pra eles (mesmo tratamento de
   * `orcamentoId` opcional). */
  presetsElementoParede?: ElementoParedePresetRow[];
}

/** Estado inicial de ambientes sempre não-vazio na entrada de `AmbientesLab`
 * — `carregarEstadoAmbiente`/`estadoAmbientePadrao` já garantem isso, mas um
 * blob de localStorage salvo por uma sessão anterior à Task 2.3-2.6 (ainda no
 * formato singular `parede`) cai em `parsed.ambientes ?? padrao.ambientes`
 * (`persistenciaLocal.ts`) — nunca em array vazio de verdade, mas o guarda
 * abaixo é a rede de segurança pra nunca indexar `[0]` de um array vazio. */
function ambientesGarantidos(ambientes: AmbienteItem[]): AmbienteItem[] {
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

function encontrarParede(
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

export function AmbientesLab({
  estadoInicial,
  onSalvar,
  onMutarAmbientes,
  orcamentoId,
  presetsElementoParede = [],
}: AmbientesLabProps) {
  const [ambientes, setAmbientes] = useState<AmbienteItem[]>(() =>
    ambientesGarantidos(estadoInicial.ambientes)
  );
  const [ambienteSelecionadoId, setAmbienteSelecionadoId] = useState<string>(
    () => ambientesGarantidos(estadoInicial.ambientes)[0].id
  );
  const [paredeSelecionadaId, setParedeSelecionadaId] = useState<string>(
    () => ambientesGarantidos(estadoInicial.ambientes)[0].paredes[0].id
  );
  // `parede` é a cópia de trabalho da parede SELECIONADA — todo o restante do
  // componente (elementos, itens, elevação, conjuntos) já lê/edita só este
  // estado, sem saber que existem outras paredes. Trocar a seleção grava esta
  // cópia de volta em `ambientes` (`selecionarAmbiente`/`selecionarParede`)
  // antes de carregar a nova — nunca mistura dados de duas paredes na tela.
  const [parede, setParede] = useState<ParedeComMeta>(
    () => ambientesGarantidos(estadoInicial.ambientes)[0].paredes[0]
  );
  const [alturas, setAlturas] = useState<AlturasFaixas>(() => estadoInicial.alturas);
  const [presets, setPresets] = useState<BoxPreset[]>([]);
  const [modulos, setModulos] = useState<ModuloOrcamento[]>(() => estadoInicial.modulos);

  // Task 2.3-2.6 — CRUD imediato de ambiente/parede: `comandoEmVoo` desabilita
  // a lista inteira durante um round-trip ao servidor (evita dois comandos
  // concorrentes); `erroComando` é feedback legível (Design-System Seção 11).
  const [comandoEmVoo, setComandoEmVoo] = useState(false);
  const [erroComando, setErroComando] = useState<string | null>(null);

  // Ambiente selecionado — nunca `undefined` na prática (`ambientesGarantidos`
  // garante >= 1 ambiente/parede na entrada, e `aplicarNovaListaAmbientes`
  // sempre reconcilia a seleção para um id que existe na árvore fresca), mas
  // cai no primeiro ambiente por segurança se a seleção ficar momentaneamente
  // desalinhada entre re-renders.
  const ambienteSelecionado = ambientes.find((a) => a.id === ambienteSelecionadoId) ?? ambientes[0];

  const [novoTipo, setNovoTipo] = useState<ElementoParede["tipo"]>("janela");
  // `novoX`/`novoY` guardam o valor EXIBIDO na referência selecionada
  // (`novoRefX`/`novoRefY`), não necessariamente o canônico — só coincidem
  // quando a referência é "esquerda"/"chao" (default).
  const [novoX, setNovoX] = useState(0);
  const [novoY, setNovoY] = useState(900);
  const [novaLargura, setNovaLargura] = useState(600);
  const [novaAltura, setNovaAltura] = useState(1000);
  const [novoNome, setNovoNome] = useState("");
  const [novoRefX, setNovoRefX] = useState<ReferenciaX>("esquerda");
  const [novoRefY, setNovoRefY] = useState<ReferenciaY>("chao");

  // Task 2.12 (front) — presets de elemento de parede: lista local (mesmo
  // padrão de `GabaritoLab.tsx::removerLocal` — atualiza em memória, sem
  // `router.refresh()`), form de aplicar/criar/excluir dentro da própria
  // seção "Elementos de parede".
  const [listaPresetsParede, setListaPresetsParede] =
    useState<ElementoParedePresetRow[]>(presetsElementoParede);
  const [presetParedeSelecionado, setPresetParedeSelecionado] = useState("");
  const [salvandoPreset, setSalvandoPreset] = useState(false);
  const [erroPreset, setErroPreset] = useState<string | null>(null);
  // Task 2.7-2.11 (front) — índice do elemento em edição inline; `null` =
  // formulário em modo "adicionar". Os dois caminhos de entrada (lápis na
  // lista, clique no 2D) só setam este estado, convergindo no mesmo form.
  const [elementoEditandoIndice, setElementoEditandoIndice] = useState<number | null>(null);

  const [presetSelecionado, setPresetSelecionado] = useState<string>("");
  const [faixaSelecionada, setFaixaSelecionada] = useState<Faixa>("inferior");
  // Task 2.18 (front) — entrada em VÃO até o vizinho, não X absoluto (Modelo
  // de Domínio 3.1.1). `vaoItem`/`refVaoItem` são só o valor digitado; o `x`
  // absoluto gravado em `ItemPosicionado` vem de `converterVaoParaX`.
  const [vaoItem, setVaoItem] = useState(0);
  const [refVaoItem, setRefVaoItem] = useState<ReferenciaVao>("esquerda");
  const [erroVaoItem, setErroVaoItem] = useState<string | null>(null);

  // Task 2.19-2.23 (front) — personalização de instância no momento da
  // inserção: copia os valores do preset pro estado local, editável, sem
  // nunca tocar o preset da biblioteca (mesmo espírito da Task 2.12).
  const [larguraItem, setLarguraItem] = useState(0);
  const [alturaItem, setAlturaItem] = useState(0);
  const [profundidadeItem, setProfundidadeItem] = useState(0);
  const [corCaixaItem, setCorCaixaItem] = useState("");
  const [espessuraCaixaItem, setEspessuraCaixaItem] = useState(18);
  const [corPortasItem, setCorPortasItem] = useState("");
  const [espessuraPortasItem, setEspessuraPortasItem] = useState(18);
  const [temFundoItem, setTemFundoItem] = useState(true);
  const [puxadorItem, setPuxadorItem] = useState<TipoPuxador>("haste");

  // Task 13.2b — overrides do handle de junção.
  const [overrides, setOverrides] = useState<OverrideJuncao[]>(() => estadoInicial.overrides);

  // Task 13.2c — catálogo (cores/espessuras disponíveis pro material do
  // Elemento Contínuo). Não é escopado por orçamento — é o catálogo da
  // organização inteira, igual ao resto do produto.
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);

  // Seleção de Conjunto/item avulso e os Elementos Contínuos adicionados.
  const [selecao, setSelecao] = useState<SelecaoAlvo | null>(null);
  const [elementosContinuos, setElementosContinuos] = useState<ElementoContinuo[]>(
    () => estadoInicial.elementosContinuos
  );

  // Formulário de "adicionar elemento".
  const [novoTipoElemento, setNovoTipoElemento] = useState<TipoElementoContinuo>("tampo");
  const [novaPosicaoElemento, setNovaPosicaoElemento] = useState<PosicaoElemento>("superior");
  const [moduloTamponamento, setModuloTamponamento] = useState<string>("");
  const [corElemento, setCorElemento] = useState<string>("");
  const [espessuraElemento, setEspessuraElemento] = useState<number>(18);

  // Task 13.3d — "Salvar alterações": ação explícita (não autosave). Feedback
  // legível de sucesso/erro (Design-System Seção 11 / Alert, Seção 7.13).
  const [salvando, setSalvando] = useState(false);
  const [resultadoSalvar, setResultadoSalvar] = useState<ResultadoSalvarAmbiente | null>(null);

  useEffect(() => {
    seedPresetsPadrao();
    const lista = listarPresets();
    setPresets(lista);
    if (lista[0]) setPresetSelecionado(lista[0].id);
    setCatalogo(carregarCatalogo());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function atualizarParede(patch: Partial<Parede>) {
    setParede((p) => ({ ...p, ...patch }));
    setResultadoSalvar(null);
  }
  function atualizarAlturas(patch: Partial<AlturasFaixas>) {
    setAlturas((a) => ({ ...a, ...patch }));
    setResultadoSalvar(null);
  }

  // Task 2.3-2.6 (alturas) — estado "herdado" vs "customizado" é DERIVADO de
  // `parede.alturasOverride?.[campo] !== undefined` (Modelo-de-Domínio Seção
  // 3.2.1), nunca um flag próprio. "Voltar ao herdado" apaga a chave do
  // override (nunca copia o valor numérico do perfil) — é isso que mantém a
  // propagação futura funcionando quando o perfil muda depois.
  function alturaCustomizada(campo: keyof AlturasFaixas): boolean {
    return parede.alturasOverride?.[campo] !== undefined;
  }
  function alturaEfetiva(campo: keyof AlturasFaixas): number {
    return parede.alturasOverride?.[campo] ?? alturas[campo];
  }
  function setAlturaOverride(campo: keyof AlturasFaixas, valor: number) {
    atualizarParede({ alturasOverride: definirAlturaOverride(parede.alturasOverride, campo, valor) });
  }
  function voltarAoHerdado(campo: keyof AlturasFaixas) {
    atualizarParede({ alturasOverride: removerAlturaOverride(parede.alturasOverride, campo) });
  }

  // Task 2.3-2.6 — troca de seleção de ambiente/parede: sempre grava a cópia
  // de trabalho ATUAL (`parede`) de volta em `ambientes` antes de trocar, e só
  // então carrega a nova seleção — nenhum dado de edição em progresso (ainda
  // não salvo pelo botão "Salvar alterações") se perde ao navegar entre
  // paredes. Reseta seleção de Conjunto/formulário de elemento: pertencem à
  // parede anterior.
  function limparSelecaoAoTrocarDeParede() {
    setSelecao(null);
    limparFormularioElemento();
    setResultadoSalvar(null);
  }

  function selecionarParede(novaParedeId: string) {
    if (novaParedeId === paredeSelecionadaId) return;
    const listaAtualizada = substituirParedeNaLista(ambientes, ambienteSelecionadoId, parede);
    const novaParede = encontrarParede(listaAtualizada, ambienteSelecionadoId, novaParedeId);
    setAmbientes(listaAtualizada);
    if (novaParede) setParede(novaParede);
    setParedeSelecionadaId(novaParedeId);
    limparSelecaoAoTrocarDeParede();
  }

  function selecionarAmbiente(novoAmbienteId: string) {
    if (novoAmbienteId === ambienteSelecionadoId) return;
    const listaAtualizada = substituirParedeNaLista(ambientes, ambienteSelecionadoId, parede);
    const novoAmbiente = listaAtualizada.find((a) => a.id === novoAmbienteId);
    const novaParede = novoAmbiente?.paredes[0];
    setAmbientes(listaAtualizada);
    setAmbienteSelecionadoId(novoAmbienteId);
    if (novaParede) {
      setParede(novaParede);
      setParedeSelecionadaId(novaParede.id);
    }
    limparSelecaoAoTrocarDeParede();
  }

  // Aplica a árvore fresca devolvida por um comando de CRUD imediato
  // (`onMutarAmbientes`/`aplicarComandoAmbiente`). Se a parede/ambiente
  // selecionados continuam existindo e não mudaram, preserva a edição
  // profunda em progresso (`parede.elementos`/`itens`/`largura`/`altura`, só
  // persistida pelo botão "Salvar alterações") por cima da árvore fresca —
  // só nome/ordem (o que o comando pode ter mudado) vêm da árvore fresca.
  // Se a seleção precisou mudar (o item selecionado foi excluído), adota a
  // árvore fresca como está e cai para o primeiro ambiente/parede disponível.
  function aplicarNovaListaAmbientes(novaLista: AmbienteItem[]) {
    const ambienteContinuaExistindo = novaLista.some((a) => a.id === ambienteSelecionadoId);
    let novoAmbienteId = ambienteSelecionadoId;
    let novaParedeId = paredeSelecionadaId;

    if (!ambienteContinuaExistindo) {
      novoAmbienteId = novaLista[0]?.id ?? "";
      novaParedeId = novaLista[0]?.paredes[0]?.id ?? "";
    } else {
      const ambienteAtual = novaLista.find((a) => a.id === novoAmbienteId)!;
      if (!ambienteAtual.paredes.some((p) => p.id === novaParedeId)) {
        novaParedeId = ambienteAtual.paredes[0]?.id ?? "";
      }
    }

    const selecaoInalterada = novoAmbienteId === ambienteSelecionadoId && novaParedeId === paredeSelecionadaId;
    const paredeFresca = encontrarParede(novaLista, novoAmbienteId, novaParedeId);
    const listaFinal =
      selecaoInalterada && paredeFresca
        ? substituirParedeNaLista(novaLista, novoAmbienteId, { ...paredeFresca, elementos: parede.elementos, itens: parede.itens, largura: parede.largura, altura: parede.altura })
        : novaLista;

    setAmbientes(listaFinal);
    setAmbienteSelecionadoId(novoAmbienteId);
    setParedeSelecionadaId(novaParedeId);
    if (!selecaoInalterada) {
      const novaParedeSelecionada = encontrarParede(listaFinal, novoAmbienteId, novaParedeId);
      if (novaParedeSelecionada) setParede(novaParedeSelecionada);
      limparSelecaoAoTrocarDeParede();
    }
  }

  async function executarComandoAmbiente(comando: ComandoAmbiente) {
    setComandoEmVoo(true);
    setErroComando(null);
    const resultado = onMutarAmbientes
      ? await onMutarAmbientes(comando)
      : { ok: true, ambientes: aplicarComandoAmbiente(ambientes, comando, novoIdLocal) };
    setComandoEmVoo(false);
    if (!resultado.ok || !resultado.ambientes) {
      setErroComando(resultado.erro ?? "Não foi possível concluir esta ação.");
      return;
    }
    if (resultado.modulos) setModulos(resultado.modulos);
    aplicarNovaListaAmbientes(resultado.ambientes);
  }

  function moverAmbiente(id: string, direcao: "cima" | "baixo") {
    const idsAtuais = ambientes.map((a) => a.id);
    const novaOrdem = moverIdNaLista(idsAtuais, id, direcao);
    if (novaOrdem !== idsAtuais) {
      executarComandoAmbiente({ tipo: "reordenarAmbientes", idsNaNovaOrdem: novaOrdem });
    }
  }

  function moverParede(id: string, direcao: "cima" | "baixo") {
    const idsAtuais = ambienteSelecionado.paredes.map((p) => p.id);
    const novaOrdem = moverIdNaLista(idsAtuais, id, direcao);
    if (novaOrdem !== idsAtuais) {
      executarComandoAmbiente({
        tipo: "reordenarParedes",
        ambienteId: ambienteSelecionadoId,
        idsNaNovaOrdem: novaOrdem,
      });
    }
  }

  function mudarRefX(ref: ReferenciaX) {
    setNovoX(recalcularValorAoTrocarRef(novoX, novoRefX, ref, parede.largura, novaLargura));
    setNovoRefX(ref);
  }
  function mudarRefY(ref: ReferenciaY) {
    setNovoY(recalcularValorAoTrocarRef(novoY, novoRefY, ref, parede.altura, novaAltura));
    setNovoRefY(ref);
  }

  function limparFormularioElemento() {
    setElementoEditandoIndice(null);
    setNovoTipo("janela");
    setNovoRefX("esquerda");
    setNovoRefY("chao");
    setNovoX(0);
    setNovoY(900);
    setNovaLargura(600);
    setNovaAltura(1000);
    setNovoNome("");
  }

  function editarElemento(indice: number) {
    const el = parede.elementos[indice];
    setNovoTipo(el.tipo);
    setNovoRefX(el.refX);
    setNovoRefY(el.refY);
    setNovoX(canonicoParaValor(el.x, el.refX, parede.largura, el.largura));
    setNovoY(canonicoParaValor(el.y, el.refY, parede.altura, el.altura));
    setNovaLargura(el.largura);
    setNovaAltura(el.altura);
    setNovoNome(el.nome ?? "");
    setElementoEditandoIndice(indice);
  }

  function salvarElemento() {
    const elemento: ElementoParede = {
      id: elementoEditandoIndice !== null ? parede.elementos[elementoEditandoIndice].id : novoItemId(),
      tipo: novoTipo,
      nome: novoNome.trim() || undefined,
      x: valorParaCanonico(novoX, novoRefX, parede.largura, novaLargura),
      y: valorParaCanonico(novoY, novoRefY, parede.altura, novaAltura),
      largura: novaLargura,
      altura: novaAltura,
      refX: novoRefX,
      refY: novoRefY,
    };
    setParede((p) => ({
      ...p,
      elementos: salvarElementoNaLista(p.elementos, elemento, elementoEditandoIndice),
    }));
    setResultadoSalvar(null);
    limparFormularioElemento();
  }
  function removerElemento(indice: number) {
    setParede((p) => ({ ...p, elementos: p.elementos.filter((_, i) => i !== indice) }));
    if (elementoEditandoIndice === indice) limparFormularioElemento();
    setResultadoSalvar(null);
  }

  // Task 2.12 (front) — selecionar um preset copia nome/largura/altura pro
  // formulário de adicionar elemento (Modelo de Domínio 3.2.3: cópia, sem
  // vínculo vivo — `ElementoParede` não guarda `presetId`). Reseta o Select
  // de volta ao placeholder logo em seguida pra permitir reaplicar o mesmo
  // preset outra vez.
  function selecionarPresetParede(id: string) {
    const preset = listaPresetsParede.find((p) => p.id === id);
    if (preset) {
      const campos = aplicarPresetElementoParede({ novaLargura, novaAltura }, preset);
      setNovoNome(campos.novoNome);
      setNovaLargura(campos.novaLargura);
      setNovaAltura(campos.novaAltura);
    }
    setPresetParedeSelecionado("");
  }

  async function salvarComoPresetParede() {
    if (!novoNome.trim()) {
      setErroPreset("Informe o nome antes de salvar como preset.");
      return;
    }
    setSalvandoPreset(true);
    setErroPreset(null);
    const resultado = await criarElementoParedePreset({
      nome: novoNome,
      larguraPadrao: novaLargura,
      alturaPadrao: novaAltura,
    });
    setSalvandoPreset(false);
    if (!resultado.ok || !resultado.preset) {
      setErroPreset(resultado.erro ?? "Não foi possível salvar este preset.");
      return;
    }
    const presetCriado = resultado.preset;
    setListaPresetsParede((atuais) =>
      [...atuais, presetCriado].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    );
  }

  async function excluirPresetParede(id: string) {
    const resultado = await excluirElementoParedePreset(id);
    if (resultado.ok) {
      setListaPresetsParede((atuais) => atuais.filter((p) => p.id !== id));
    }
  }

  // Task 2.19-2.23 (front) — repopula os campos de personalização a partir
  // do preset sempre que a seleção muda, pra nunca vazar valor customizado
  // do módulo anterior pro novo. Cor/espessura de porta seguem a cadeia de
  // fallback: override de instância do preset > material do 1º grupo de
  // porta > cor/espessura da caixa (só usado como default de exibição —
  // fica oculto se o preset não tem nenhum grupo de porta).
  useEffect(() => {
    const preset = presets.find((p) => p.id === presetSelecionado);
    if (!preset) return;
    const box = preset.box;
    const materialPortas = box.overridePortas ?? box.portas[0]?.material ?? box.caixa;
    setLarguraItem(box.largura);
    setAlturaItem(box.altura);
    setProfundidadeItem(box.profundidade);
    setCorCaixaItem(box.caixa.cor);
    setEspessuraCaixaItem(box.caixa.espessura);
    setCorPortasItem(materialPortas.cor);
    setEspessuraPortasItem(materialPortas.espessura);
    setTemFundoItem(box.temFundo);
    setPuxadorItem(box.puxador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetSelecionado]);

  // Ao posicionar: COPIA o box do preset pra um módulo de instância novo (id
  // de instância, não o id do preset — mesma decisão da Task 13.3c, agora
  // persistida de verdade em `orcamento.itens`) e guarda só a POSIÇÃO em
  // `parede.itens` (contrato: "orcamento.itens = módulos; parede.itens =
  // posições referenciando esses itemIds").
  function adicionarItem() {
    if (!presetSelecionado) return;
    const preset = presets.find((p) => p.id === presetSelecionado);
    if (!preset) return;

    const largura = larguraItem;
    // Item ainda não posicionado: `x` provisório "encostado na borda direita
    // da parede" — a convenção que `calcularVizinhos` documenta como a que
    // produz os vizinhos corretos pra entrada (Seção 3.1.1).
    const vizinhos = calcularVizinhos(parede, resolvedor, {
      faixa: faixaSelecionada,
      x: parede.largura - largura,
      largura,
    });
    const resultado = converterVaoParaX(vaoItem, refVaoItem, largura, vizinhos);
    if (!resultado.ok) {
      setErroVaoItem(resultado.mensagem);
      return;
    }

    const itemId = novoItemId();
    const box: BoxModule = {
      ...preset.box,
      id: itemId,
      largura: larguraItem,
      altura: alturaItem,
      profundidade: profundidadeItem,
      caixa: { cor: corCaixaItem, espessura: espessuraCaixaItem },
      ...(preset.box.portas.length > 0
        ? { overridePortas: { cor: corPortasItem, espessura: espessuraPortasItem } }
        : {}),
      temFundo: temFundoItem,
      puxador: puxadorItem,
    };
    const modulo: ModuloOrcamento = { origem: "custom_box", box };
    const posicao: ItemPosicionado = {
      itemId,
      x: resultado.x,
      faixa: faixaSelecionada,
      refEntrada: refVaoItem,
    };

    setModulos((ms) => [...ms, modulo]);
    setParede((p) => ({ ...p, itens: [...p.itens, posicao] }));
    setResultadoSalvar(null);
    setVaoItem(0);
    setErroVaoItem(null);
  }
  function removerItem(itemId: string) {
    setModulos((ms) => ms.filter((m) => idDoItem(m) !== itemId));
    setParede((p) => ({ ...p, itens: p.itens.filter((i) => i.itemId !== itemId) }));
    setResultadoSalvar(null);
  }

  const resolvedor: ResolvedorItens = useMemo(() => {
    const m = new Map<string, ModuloOrcamento>();
    for (const modulo of modulos) m.set(idDoItem(modulo), modulo);
    return m;
  }, [modulos]);

  // Tier 1 + Tier 2 rodam a cada mudança de posicionamento/parede/alturas
  // (useMemo recalcula sempre que qualquer dependência muda — não há botão
  // "validar", é reativo). `parede` já carrega `itens` (posições) direto —
  // não precisa mais de um wrapper `paredeComItens` (Task 13.3c).
  const warnings: EngineWarning[] = useMemo(
    () => [...validarParedeTier1(parede, resolvedor), ...validarParedeTier2(parede, alturas, resolvedor)],
    [parede, alturas, resolvedor]
  );

  // itemId -> pior severidade (erro > aviso), consumido pelo destaque visual
  // do BoxCanvas modo conjunto (ver Nota de Escopo do contrato / comentário
  // em BoxCanvas.tsx).
  const itensComAviso = useMemo(() => {
    const m = new Map<string, "erro" | "aviso">();
    for (const w of warnings) {
      if (!w.moduloId) continue;
      if (m.get(w.moduloId) !== "erro") m.set(w.moduloId, w.severidade);
    }
    return m;
  }, [warnings]);

  const itensDoConjunto: ItemDoConjunto[] = useMemo(
    () =>
      parede.itens
        .map((posicao) => {
          const item = resolvedor.get(posicao.itemId);
          return item ? { item, posicao } : null;
        })
        .filter((v): v is ItemDoConjunto => v !== null),
    [parede.itens, resolvedor]
  );

  // Task 13.2b — Conjuntos automáticos (detecção pura, sem override) + finais
  // (override do handle de junção por cima). Nenhuma lógica de agrupamento é
  // reimplementada aqui — só consome `detectarConjuntos`/`aplicarOverrides`
  // (lib/engine/conjunto/detectar.ts, já testadas).
  const conjuntosAutomaticos = useMemo(
    () => detectarConjuntos(parede, alturas, resolvedor),
    [parede, alturas, resolvedor]
  );

  const conjuntosFinais = useMemo(
    () => aplicarOverrides(conjuntosAutomaticos, parede.itens, overrides),
    [conjuntosAutomaticos, parede.itens, overrides]
  );

  // Alterna união/quebra do par (handle de junção do BoxCanvas modo
  // conjunto): remove qualquer override existente para o par e adiciona um
  // novo com `forcar` invertido do estado atual (lido de `conjuntosFinais`,
  // nunca reconstruído aqui — é `aplicarOverrides` quem decide se o par está
  // unido). Quebrar um conjunto de 3 no meio vira 2 conjuntos de 2 (nunca
  // sobra 1) porque essa é a regra de `aplicarOverrides`, não algo garantido
  // por este callback.
  function alternarJuncao(itemIdA: string, itemIdB: string) {
    const unidoAtualmente = conjuntosFinais.some(
      (c) => c.itensIds.includes(itemIdA) && c.itensIds.includes(itemIdB)
    );
    setOverrides((atuais) => [
      ...atuais.filter(
        (o) =>
          !(
            (o.itemIdA === itemIdA && o.itemIdB === itemIdB) ||
            (o.itemIdA === itemIdB && o.itemIdB === itemIdA)
          )
      ),
      { itemIdA, itemIdB, forcar: unidoAtualmente ? "quebrado" : "unido" },
    ]);
    setResultadoSalvar(null);
  }

  // Task 13.2c — itens que NÃO pertencem a nenhum Conjunto ("avulsos"): alvo
  // válido de Elemento Contínuo tanto quanto um Conjunto (Modelo de Domínio
  // 3.4 — `alvo: { conjuntoId } | { moduloId }`, "bloco ou módulo isolado").
  const idsEmConjunto = useMemo(
    () => new Set(conjuntosFinais.flatMap((c) => c.itensIds)),
    [conjuntosFinais]
  );
  const itensAvulsos: ItemPosicionado[] = useMemo(
    () => parede.itens.filter((i) => !idsEmConjunto.has(i.itemId)),
    [parede.itens, idsEmConjunto]
  );

  function nomeDoItem(itemId: string): string {
    const modulo = resolvedor.get(itemId);
    if (!modulo) return itemId;
    return modulo.origem === "custom_box" ? modulo.box.nome : modulo.placa.nome;
  }

  // Itens (ordenados por x) que compõem a seleção atual — um Conjunto inteiro
  // ou um único item avulso. `conjunto.itensIds` já vem ordenado por x
  // (ver lib/engine/conjunto/detectar.ts), então o índice dentro deste array
  // já reflete a posição esquerda→direita real na parede.
  const itensDaSelecao: string[] = useMemo(() => {
    if (!selecao) return [];
    if (selecao.tipo === "item") return [selecao.itemId];
    const conjunto = conjuntosFinais.find((c) => c.id === selecao.conjuntoId);
    return conjunto ? conjunto.itensIds : [];
  }, [selecao, conjuntosFinais]);

  // Decisão de domínio (extremidade exposta — contrato Task 13.2c, ponto
  // deliberadamente em aberto na spec): `AlvoResolvido` (lib/engine/
  // elemento-continuo/types.ts) só tem a forma `{ moduloExtremidade }` (um
  // ÚNICO módulo) pra tamponamento — nunca `{ itens }` (o bloco inteiro).
  // Por isso, tamponamento SEMPRE mira um módulo específico, mesmo quando a
  // seleção é um Conjunto: a esquerda/direita só fazem sentido no módulo da
  // ponta correspondente (índice 0 / último de `itensDaSelecao`, já ordenado
  // por x); base/topo, por outro lado, não têm noção de "extremidade
  // horizontal" nenhuma — decisão adotada aqui: qualquer módulo do bloco
  // pode receber base/topo independentemente. Um item avulso (fora de
  // Conjunto) expõe os 4 lados.
  function posicoesDisponiveisTamponamento(moduloId: string): PosicaoElemento[] {
    const todas = POSICOES_VALIDAS.tamponamento;
    if (selecao?.tipo === "item") return todas;
    const idx = itensDaSelecao.indexOf(moduloId);
    if (idx === -1) return todas;
    const extremidadeEsquerda = idx === 0;
    const extremidadeDireita = idx === itensDaSelecao.length - 1;
    return todas.filter((p) => {
      if (p === "esquerda") return extremidadeEsquerda;
      if (p === "direita") return extremidadeDireita;
      return true; // base/topo — disponível pra qualquer módulo do bloco (ver decisão acima)
    });
  }

  const moduloTamponamentoAtual = moduloTamponamento || itensDaSelecao[0] || "";

  const posicoesDisponiveis: PosicaoElemento[] =
    novoTipoElemento === "tamponamento"
      ? posicoesDisponiveisTamponamento(moduloTamponamentoAtual)
      : POSICOES_VALIDAS[novoTipoElemento];

  // Reseta o formulário (tipo/posição/módulo-alvo/material) sempre que a
  // seleção muda — evita carregar estado de um Conjunto/item anterior.
  useEffect(() => {
    setNovoTipoElemento("tampo");
    setNovaPosicaoElemento("superior");
    setModuloTamponamento("");
    if (catalogo) setCorElemento(coresDisponiveis(catalogo)[0] ?? "");
    setEspessuraElemento(18);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveSelecao(selecao)]);

  // Mantém a posição sempre dentro do conjunto disponível (troca de tipo,
  // troca de módulo-alvo do tamponamento etc. podem invalidar a atual).
  useEffect(() => {
    if (!posicoesDisponiveis.includes(novaPosicaoElemento)) {
      setNovaPosicaoElemento(posicoesDisponiveis[0] ?? "superior");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novoTipoElemento, moduloTamponamentoAtual, selecao]);

  function elementoPertenceASelecao(elemento: ElementoContinuo): boolean {
    if (!selecao) return false;
    if ("conjuntoId" in elemento.alvo) {
      return selecao.tipo === "conjunto" && elemento.alvo.conjuntoId === selecao.conjuntoId;
    }
    // { moduloId }: pertence à seleção se for exatamente o item avulso
    // selecionado, ou um módulo dentro do Conjunto selecionado (caso do
    // tamponamento, que sempre mira um módulo específico — ver acima).
    return selecao.tipo === "item"
      ? elemento.alvo.moduloId === selecao.itemId
      : itensDaSelecao.includes(elemento.alvo.moduloId);
  }

  const elementosDaSelecao = useMemo(
    () => elementosContinuos.filter(elementoPertenceASelecao),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [elementosContinuos, selecao, itensDaSelecao]
  );

  // Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — extraída para
  // `lib/ambiente/resolverAlvo.ts` (função pura, sem estado de UI) para ser
  // reaproveitada também por `CorteMaterialLab` (plano de corte/lista de
  // material do orçamento inteiro), sem duplicar a regra de resolução de
  // alvo em dois lugares. `resolvedor`/`conjuntosFinais` já existem acima
  // (Task 13.2b/13.3c) — só passamos como parâmetro em vez de fechar sobre o
  // escopo do componente.

  const elementosContinuosResolvidos: ElementoContinuoResolvido[] = useMemo(
    () =>
      elementosDaSelecao
        .map((elemento) => {
          const alvo = resolverAlvoElemento(elemento, resolvedor, conjuntosFinais);
          return alvo ? { elemento, alvo } : null;
        })
        .filter((v): v is ElementoContinuoResolvido => v !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [elementosDaSelecao, conjuntosFinais, resolvedor]
  );

  // Task 13.2c — primeira vez que `calcularOrcamentoMisto` roda dentro de
  // `/ambientes` (até aqui só existia no Editor de Item, Task 13.1). Só
  // calcula o BOM dos Elementos Contínuos da seleção atual — não replica o
  // painel de custo completo do Editor de Item (fora de escopo, ver contrato).
  const resultadoElementosContinuos = useMemo(
    () =>
      calcularOrcamentoMisto({
        ambiente: { tipo: "ambiente", materiais: MATERIAIS_PADRAO },
        parametros: PARAMETROS_FABRICA_PADRAO,
        itens: [],
        elementosContinuos: elementosContinuosResolvidos,
      }),
    [elementosContinuosResolvidos]
  );

  function adicionarElementoContinuo() {
    if (!selecao) return;
    const cor = corElemento || (catalogo ? coresDisponiveis(catalogo)[0] : undefined) || "Branco TX";
    const material: BoxMaterial = { cor, espessura: espessuraElemento };

    let alvo: AlvoElementoContinuo;
    if (novoTipoElemento === "tamponamento") {
      if (!moduloTamponamentoAtual) return;
      alvo = { moduloId: moduloTamponamentoAtual };
    } else {
      alvo = selecao.tipo === "conjunto" ? { conjuntoId: selecao.conjuntoId } : { moduloId: selecao.itemId };
    }

    const elemento: ElementoContinuo = {
      id: novoElementoId(),
      tipo: novoTipoElemento,
      alvo,
      posicao: novaPosicaoElemento,
      material,
    };
    setElementosContinuos((els) => [...els, elemento]);
    setResultadoSalvar(null);
  }

  function removerElementoContinuo(id: string) {
    setElementosContinuos((els) => els.filter((e) => e.id !== id));
    setResultadoSalvar(null);
  }

  async function handleSalvar() {
    setSalvando(true);
    setResultadoSalvar(null);
    // Grava a edição em progresso da parede selecionada de volta na árvore
    // ANTES de enviar — `onSalvar` (Task 13.3d) sempre recebe/grava a lista
    // inteira (Task 2.3-2.6 — [V2.1] fim do singleton), não só a parede ativa.
    const ambientesParaSalvar = substituirParedeNaLista(ambientes, ambienteSelecionadoId, parede);
    const estado: EstadoAmbiente = {
      ambientes: ambientesParaSalvar,
      modulos,
      alturas,
      elementosContinuos,
      overrides,
    };
    const resultado = await onSalvar(estado);
    setSalvando(false);
    setResultadoSalvar(resultado);
    if (resultado.ok) {
      // Bootstrap do orçamento novo (ver `ResultadoSalvarAmbiente.idsRemapeados`):
      // troca os ids sentinela em memória pelos ids reais do banco, senão o
      // PRÓXIMO salvamento tentaria um UPDATE que não afeta nenhuma linha e
      // criaria uma linha duplicada.
      const listaFinal = resultado.idsRemapeados
        ? remapearIdsAmbientes(ambientesParaSalvar, resultado.idsRemapeados)
        : ambientesParaSalvar;
      const novoAmbienteId = resultado.idsRemapeados?.ambientes[ambienteSelecionadoId] ?? ambienteSelecionadoId;
      const novaParedeId = resultado.idsRemapeados?.paredes[paredeSelecionadaId] ?? paredeSelecionadaId;
      setAmbientes(listaFinal);
      setAmbienteSelecionadoId(novoAmbienteId);
      setParedeSelecionadaId(novaParedeId);
      if (novaParedeId !== paredeSelecionadaId) {
        setParede((p) => ({ ...p, id: novaParedeId }));
      }
    }
  }

  const presetItemAtual = presets.find((p) => p.id === presetSelecionado);
  const temPortasNoPresetAtual = (presetItemAtual?.box.portas.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-lg">
      {/* Task 2.3-2.6 — seletor de ambiente/parede: indicação visual
          PERMANENTE (aba ativa, não hover — Design-System §7.8) de qual
          ambiente e qual parede estão em edição. Selecionar uma parede troca
          o painel inteiro abaixo (Parede/Elementos/Itens/Elevação) para os
          dados dela — `parede` só reflete a seleção atual. */}
      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <h2 className="mb-3 text-titulo-secao text-cinza-900">Ambientes e paredes</h2>
        {erroComando && (
          <Alert variant="erro" className="mb-3">
            <AlertDescription>{erroComando}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-lg">
          <SeletorLista
            rotulo="ambiente"
            rotuloPlural="Ambientes"
            itens={ambientes.map((a) => ({ id: a.id, nome: a.nome }))}
            selecionadoId={ambienteSelecionadoId}
            onSelecionar={selecionarAmbiente}
            onCriar={(nome) => executarComandoAmbiente({ tipo: "criarAmbiente", nome })}
            onRenomear={(id, nome) =>
              executarComandoAmbiente({ tipo: "renomearAmbiente", ambienteId: id, nome })
            }
            onExcluir={(id) => executarComandoAmbiente({ tipo: "excluirAmbiente", ambienteId: id })}
            onMover={moverAmbiente}
            desabilitado={comandoEmVoo}
          />
          <SeletorLista
            rotulo="parede"
            rotuloPlural="Paredes"
            itens={ambienteSelecionado.paredes.map((p) => ({ id: p.id, nome: p.nome }))}
            selecionadoId={paredeSelecionadaId}
            onSelecionar={selecionarParede}
            onCriar={(nome) =>
              executarComandoAmbiente({ tipo: "criarParede", ambienteId: ambienteSelecionadoId, nome })
            }
            onRenomear={(id, nome) =>
              executarComandoAmbiente({ tipo: "renomearParede", paredeId: id, nome })
            }
            onExcluir={(id) => executarComandoAmbiente({ tipo: "excluirParede", paredeId: id })}
            onMover={moverParede}
            desabilitado={comandoEmVoo}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
        <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
          <h2 className="mb-3 text-titulo-secao text-cinza-900">Parede</h2>
          <div className="grid grid-cols-2 gap-sm">
            <div>
              <Label htmlFor="parede-largura">Largura (mm)</Label>
              <Input
                id="parede-largura"
                type="number"
                value={parede.largura}
                onChange={(e) => atualizarParede({ largura: numero(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="parede-altura">Altura (mm)</Label>
              <Input
                id="parede-altura"
                type="number"
                value={parede.altura}
                onChange={(e) => atualizarParede({ altura: numero(e.target.value) })}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
          <h2 className="mb-1 text-titulo-secao text-cinza-900">Alturas do perfil</h2>
          <p className="mb-3 text-corpo-pequeno text-cinza-500">
            Perfil de alturas da marcenaria — ao salvar, vale para todos os orçamentos da
            organização, não só este.
          </p>
          {/* Task 2.3-2.6 (alturas) — o formulário de alturas padrão da
              organização vive só aqui (decisão documentada da Task 13.7a:
              `/perfil` deliberadamente não duplica este campo). O aviso de
              propagação pedido pelo contrato entra ao lado deste salvamento,
              que é o único lugar real onde `organizacao.alturas_padrao` é
              editado. */}
          <Alert variant="aviso" className="mb-3">
            <AlertTriangle className="h-4 w-4 text-aviso" aria-hidden="true" />
            <AlertDescription>
              Mudar uma altura aqui afeta todas as paredes que não têm essa altura customizada
              individualmente — paredes com override próprio continuam com o valor delas.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-2 gap-sm">
            <div>
              <Label htmlFor="altura-rodape">Rodapé (mm)</Label>
              <Input
                id="altura-rodape"
                type="number"
                value={alturas.alturaRodape}
                onChange={(e) => atualizarAlturas({ alturaRodape: numero(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="altura-bancada">Bancada (mm)</Label>
              <Input
                id="altura-bancada"
                type="number"
                value={alturas.alturaBancada}
                onChange={(e) => atualizarAlturas({ alturaBancada: numero(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="altura-aereo">Instalação aéreo (mm)</Label>
              <Input
                id="altura-aereo"
                type="number"
                value={alturas.alturaInstalacaoAereo}
                onChange={(e) =>
                  atualizarAlturas({ alturaInstalacaoAereo: numero(e.target.value) })
                }
              />
            </div>
            <div>
              <Label htmlFor="pe-direito">Pé-direito (mm)</Label>
              <Input
                id="pe-direito"
                type="number"
                value={alturas.peDireito}
                onChange={(e) => atualizarAlturas({ peDireito: numero(e.target.value) })}
              />
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <h2 className="mb-1 text-titulo-secao text-cinza-900">Alturas desta parede</h2>
        <p className="mb-3 text-corpo-pequeno text-cinza-500">
          Cada altura herda o valor do perfil da organização até ser customizada aqui — a
          customização vale só para esta parede.
        </p>
        <div className="grid grid-cols-2 gap-sm">
          {CAMPOS_ALTURA.map(({ campo, rotulo, id }) => {
            const customizada = alturaCustomizada(campo);
            return (
              <div key={campo}>
                <div className="mb-1 flex items-center justify-between gap-sm">
                  <Label htmlFor={id}>{rotulo}</Label>
                  <Badge variant={customizada ? "enviado" : "neutro"}>
                    {customizada ? "Customizado" : "Herdado"}
                  </Badge>
                </div>
                <Input
                  id={id}
                  type="number"
                  value={alturaEfetiva(campo)}
                  onChange={(e) => setAlturaOverride(campo, numero(e.target.value))}
                />
                {customizada && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1"
                    onClick={() => voltarAoHerdado(campo)}
                  >
                    Voltar ao herdado
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <h2 className="mb-3 text-titulo-secao text-cinza-900">Elementos de parede</h2>

        {/* Task 2.12 (front) — presets de elemento de parede (Modelo de
            Domínio 3.2.3): aplicar copia nome/largura/altura pro formulário
            abaixo, sem vínculo vivo. Select fica vazio quando não há
            presets (`AmbientesLabStandalone`/`AmbientesTabMock`, sem
            Supabase real, sempre caem neste caso — prop opcional default
            `[]`). */}
        <div className="mb-3 flex flex-wrap items-end gap-sm">
          <div>
            <Label htmlFor="elemento-preset">Aplicar preset</Label>
            <Select
              value={presetParedeSelecionado}
              onValueChange={selecionarPresetParede}
              disabled={listaPresetsParede.length === 0}
            >
              <SelectTrigger id="elemento-preset" className="w-52">
                <SelectValue placeholder="Nenhum preset salvo" />
              </SelectTrigger>
              <SelectContent>
                {listaPresetsParede.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {listaPresetsParede.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {listaPresetsParede.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 rounded-md border border-cinza-200 bg-cinza-0 py-1 pl-2 pr-1 text-corpo-pequeno text-cinza-700"
                >
                  {p.nome}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => excluirPresetParede(p.id)}
                    aria-label={`Excluir preset ${p.nome}`}
                  >
                    <X size={12} />
                  </Button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mb-3 flex flex-wrap items-end gap-sm">
          <div>
            <Label htmlFor="elemento-tipo">Tipo</Label>
            <Select value={novoTipo} onValueChange={(v) => setNovoTipo(v as ElementoParede["tipo"])}>
              <SelectTrigger id="elemento-tipo" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_ELEMENTO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ROTULO_TIPO_ELEMENTO[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="elemento-nome">Nome (opcional)</Label>
            <Input
              id="elemento-nome"
              type="text"
              className="w-40"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="elemento-ref-x">Referência X</Label>
            <Select value={novoRefX} onValueChange={(v) => mudarRefX(v as ReferenciaX)}>
              <SelectTrigger id="elemento-ref-x" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="esquerda">{ROTULO_REF_X.esquerda}</SelectItem>
                <SelectItem value="direita">{ROTULO_REF_X.direita}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="elemento-x">{ROTULO_REF_X[novoRefX]} (mm)</Label>
            <Input
              id="elemento-x"
              type="number"
              className="w-24"
              value={novoX}
              onChange={(e) => setNovoX(numero(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="elemento-ref-y">Referência Y</Label>
            <Select value={novoRefY} onValueChange={(v) => mudarRefY(v as ReferenciaY)}>
              <SelectTrigger id="elemento-ref-y" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chao">{ROTULO_REF_Y.chao}</SelectItem>
                <SelectItem value="teto">{ROTULO_REF_Y.teto}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="elemento-y">{ROTULO_REF_Y[novoRefY]} (mm)</Label>
            <Input
              id="elemento-y"
              type="number"
              className="w-24"
              value={novoY}
              onChange={(e) => setNovoY(numero(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="elemento-largura">Largura (mm)</Label>
            <Input
              id="elemento-largura"
              type="number"
              className="w-24"
              value={novaLargura}
              onChange={(e) => setNovaLargura(numero(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="elemento-altura">Altura (mm)</Label>
            <Input
              id="elemento-altura"
              type="number"
              className="w-24"
              value={novaAltura}
              onChange={(e) => setNovaAltura(numero(e.target.value))}
            />
          </div>
          <Button variant="primary" onClick={salvarElemento}>
            {elementoEditandoIndice !== null ? "Salvar" : "Adicionar"}
          </Button>
          {elementoEditandoIndice !== null && (
            <Button variant="ghost" onClick={limparFormularioElemento}>
              Cancelar
            </Button>
          )}
          <Button variant="ghost" onClick={salvarComoPresetParede} disabled={salvandoPreset}>
            Salvar como preset
          </Button>
        </div>

        {erroPreset && (
          <Alert variant="erro" className="mb-3">
            <AlertDescription>{erroPreset}</AlertDescription>
          </Alert>
        )}

        {parede.elementos.length === 0 ? (
          <p className="text-corpo-pequeno text-cinza-500">Nenhum elemento adicionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">X</TableHead>
                  <TableHead className="text-right">Y</TableHead>
                  <TableHead className="text-right">Largura</TableHead>
                  <TableHead className="text-right">Altura</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {parede.elementos.map((el, i) => (
                  <TableRow
                    key={el.id}
                    className={elementoEditandoIndice === i ? "bg-accent-subtle" : undefined}
                  >
                    <TableCell>{ROTULO_TIPO_ELEMENTO[el.tipo]}</TableCell>
                    <TableCell className="text-right tabular-nums">{el.x}</TableCell>
                    <TableCell className="text-right tabular-nums">{el.y}</TableCell>
                    <TableCell className="text-right tabular-nums">{el.largura}</TableCell>
                    <TableCell className="text-right tabular-nums">{el.altura}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => editarElemento(i)}
                          aria-label={`Editar elemento ${ROTULO_TIPO_ELEMENTO[el.tipo]}`}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removerElemento(i)}
                          aria-label={`Remover elemento ${ROTULO_TIPO_ELEMENTO[el.tipo]}`}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <h2 className="mb-3 text-titulo-secao text-cinza-900">Itens posicionados</h2>
        {presets.length === 0 ? (
          <p className="text-corpo-pequeno text-cinza-500">
            Nenhum módulo disponível. Crie um módulo em{" "}
            <a href="/modulo" className="text-accent hover:underline">
              /modulo
            </a>{" "}
            e salve como módulo da biblioteca.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-end gap-sm">
              <div>
                <Label htmlFor="item-preset">Módulo</Label>
                <Select value={presetSelecionado} onValueChange={setPresetSelecionado}>
                  <SelectTrigger id="item-preset" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="item-faixa">Faixa</Label>
                <Select value={faixaSelecionada} onValueChange={(v) => setFaixaSelecionada(v as Faixa)}>
                  <SelectTrigger id="item-faixa" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FAIXAS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {ROTULO_FAIXA[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="item-ref-vao">Referência</Label>
                <Select value={refVaoItem} onValueChange={(v) => setRefVaoItem(v as ReferenciaVao)}>
                  <SelectTrigger id="item-ref-vao" className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="esquerda">{ROTULO_REF_VAO.esquerda}</SelectItem>
                    <SelectItem value="direita">{ROTULO_REF_VAO.direita}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="item-vao">Vão (mm)</Label>
                <Input
                  id="item-vao"
                  type="number"
                  className="w-24"
                  value={vaoItem}
                  onChange={(e) => setVaoItem(numero(e.target.value))}
                />
              </div>
              <Button variant="primary" onClick={adicionarItem}>
                Adicionar
              </Button>
            </div>

            <div className="mb-3 rounded-md border border-cinza-200 bg-cinza-50 p-3">
              <h3 className="mb-2 text-corpo-pequeno font-medium text-cinza-700">Personalizar módulo</h3>
              <div className="flex flex-wrap items-end gap-sm">
                <div>
                  <Label htmlFor="item-largura">Largura (mm)</Label>
                  <Input
                    id="item-largura"
                    type="number"
                    className="w-24"
                    value={larguraItem}
                    onChange={(e) => setLarguraItem(numero(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="item-altura">Altura (mm)</Label>
                  <Input
                    id="item-altura"
                    type="number"
                    className="w-24"
                    value={alturaItem}
                    onChange={(e) => setAlturaItem(numero(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="item-profundidade">Profundidade (mm)</Label>
                  <Input
                    id="item-profundidade"
                    type="number"
                    className="w-24"
                    value={profundidadeItem}
                    onChange={(e) => setProfundidadeItem(numero(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="item-cor-caixa">Cor da caixa</Label>
                  <Select value={corCaixaItem} onValueChange={setCorCaixaItem}>
                    <SelectTrigger id="item-cor-caixa" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalogo ? coresDisponiveis(catalogo) : ["Branco TX", "Madeirado"]).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="item-espessura-caixa">Espessura da caixa</Label>
                  <Select
                    value={String(espessuraCaixaItem)}
                    onValueChange={(v) => setEspessuraCaixaItem(numero(v))}
                  >
                    <SelectTrigger id="item-espessura-caixa" className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalogo && corCaixaItem ? espessurasDaCor(catalogo, corCaixaItem) : [15, 18, 25]).map(
                        (esp) => (
                          <SelectItem key={esp} value={String(esp)}>
                            {esp} mm
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {temPortasNoPresetAtual && (
                  <>
                    <div>
                      <Label htmlFor="item-cor-portas">Cor das portas</Label>
                      <Select value={corPortasItem} onValueChange={setCorPortasItem}>
                        <SelectTrigger id="item-cor-portas" className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(catalogo ? coresDisponiveis(catalogo) : ["Branco TX", "Madeirado"]).map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="item-espessura-portas">Espessura das portas</Label>
                      <Select
                        value={String(espessuraPortasItem)}
                        onValueChange={(v) => setEspessuraPortasItem(numero(v))}
                      >
                        <SelectTrigger id="item-espessura-portas" className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(catalogo && corPortasItem
                            ? espessurasDaCor(catalogo, corPortasItem)
                            : [15, 18, 25]
                          ).map((esp) => (
                            <SelectItem key={esp} value={String(esp)}>
                              {esp} mm
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div>
                  <Label htmlFor="item-fundo">Fundo</Label>
                  <Select
                    value={temFundoItem ? "sim" : "nao"}
                    onValueChange={(v) => setTemFundoItem(v === "sim")}
                  >
                    <SelectTrigger id="item-fundo" className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">Sim</SelectItem>
                      <SelectItem value="nao">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="item-puxador">Puxador</Label>
                  <Select value={puxadorItem} onValueChange={(v) => setPuxadorItem(v as TipoPuxador)}>
                    <SelectTrigger id="item-puxador" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="haste">Haste</SelectItem>
                      <SelectItem value="perfil">Perfil</SelectItem>
                      <SelectItem value="sem_puxador">Sem puxador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {erroVaoItem && (
              <Alert variant="erro" className="mb-3">
                <AlertDescription>{erroVaoItem}</AlertDescription>
              </Alert>
            )}

            {parede.itens.length === 0 ? (
              <p className="text-corpo-pequeno text-cinza-500">Nenhum item posicionado ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Faixa</TableHead>
                      <TableHead className="text-right">Vão esq.</TableHead>
                      <TableHead className="text-right">Vão dir.</TableHead>
                      <TableHead className="text-right">Largura</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parede.itens.map((pos) => {
                      const modulo = resolvedor.get(pos.itemId);
                      const severidade = itensComAviso.get(pos.itemId);
                      // Recalculado a cada render a partir do `x` absoluto —
                      // nunca lido de campo armazenado (Seção 3.1.1).
                      const vao = converterXParaVao(parede, resolvedor, pos);
                      return (
                        <TableRow
                          key={pos.itemId}
                          className={
                            severidade === "erro"
                              ? "bg-erro-subtle"
                              : severidade === "aviso"
                                ? "bg-aviso-subtle"
                                : undefined
                          }
                        >
                          <TableCell>{nomeDoItem(pos.itemId)}</TableCell>
                          <TableCell>{ROTULO_FAIXA[pos.faixa]}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {vao ? vao.esquerda : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {vao ? vao.direita : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {modulo ? larguraDoItem(modulo) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {orcamentoId && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  asChild
                                  aria-label={`Editar item ${nomeDoItem(pos.itemId)}`}
                                >
                                  <Link href={`/orcamento/${orcamentoId}/item/${pos.itemId}`}>
                                    <Pencil size={14} />
                                  </Link>
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removerItem(pos.itemId)}
                                aria-label={`Remover item ${nomeDoItem(pos.itemId)}`}
                              >
                                <X size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
          <h2 className="mb-3 text-titulo-secao text-cinza-900">Elevação da parede</h2>
          <div className="max-w-full overflow-x-auto rounded-md border border-cinza-200 bg-cinza-50 p-2">
            <ElevacaoParede
              parede={parede}
              alturas={alturas}
              onClicarElemento={(_, indice) => editarElemento(indice)}
            />
          </div>
        </section>
        <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
          <h2 className="mb-3 text-titulo-secao text-cinza-900">Itens posicionados (conjunto)</h2>
          {itensDoConjunto.length > 0 ? (
            <BoxCanvas
              itens={itensDoConjunto}
              alturas={alturas}
              itensComAviso={itensComAviso}
              conjuntos={conjuntosFinais}
              onToggleJuncao={alternarJuncao}
            />
          ) : (
            <p className="text-corpo-pequeno text-cinza-500">Adicione um item para visualizar.</p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <section className="min-w-0 rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
          <h2 className="mb-3 text-titulo-secao text-cinza-900">Blocos e itens</h2>
          <p className="mb-3 text-corpo-pequeno text-cinza-500">
            Selecione um Conjunto ou um item avulso para adicionar tampo, rodapé, tamponamento ou
            fechamento (Elemento Contínuo).
          </p>
          {conjuntosFinais.length === 0 && itensAvulsos.length === 0 ? (
            <p className="text-corpo-pequeno text-cinza-500">Nenhum item posicionado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alvo</TableHead>
                    <TableHead>Faixa</TableHead>
                    <TableHead className="text-right">Itens</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conjuntosFinais.map((conjunto, i) => {
                    const selecionado = selecao?.tipo === "conjunto" && selecao.conjuntoId === conjunto.id;
                    return (
                      <TableRow
                        key={conjunto.id}
                        className={`cursor-pointer ${selecionado ? "bg-accent-subtle" : ""}`}
                        onClick={() => setSelecao({ tipo: "conjunto", conjuntoId: conjunto.id })}
                      >
                        <TableCell>Conjunto {i + 1}</TableCell>
                        <TableCell>{ROTULO_FAIXA[conjunto.faixa]}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {conjunto.itensIds.length}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  })}
                  {itensAvulsos.map((pos) => {
                    const selecionado = selecao?.tipo === "item" && selecao.itemId === pos.itemId;
                    return (
                      <TableRow
                        key={pos.itemId}
                        className={`cursor-pointer ${selecionado ? "bg-accent-subtle" : ""}`}
                        onClick={() => setSelecao({ tipo: "item", itemId: pos.itemId })}
                      >
                        <TableCell>{nomeDoItem(pos.itemId)} (avulso)</TableCell>
                        <TableCell>{ROTULO_FAIXA[pos.faixa]}</TableCell>
                        <TableCell className="text-right tabular-nums">1</TableCell>
                        <TableCell />
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section className="min-w-0 rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
          <h2 className="mb-3 text-titulo-secao text-cinza-900">Elementos contínuos</h2>
          {!selecao ? (
            <p className="text-corpo-pequeno text-cinza-500">
              Selecione um Conjunto ou item avulso à esquerda para configurar.
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-end gap-sm">
                <div>
                  <Label htmlFor="ec-tipo">Tipo</Label>
                  <Select
                    value={novoTipoElemento}
                    onValueChange={(v) => setNovoTipoElemento(v as TipoElementoContinuo)}
                  >
                    <SelectTrigger id="ec-tipo" className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(ROTULO_TIPO_ELEMENTO_CONTINUO) as TipoElementoContinuo[]).map((t) => (
                        <SelectItem key={t} value={t}>
                          {ROTULO_TIPO_ELEMENTO_CONTINUO[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {novoTipoElemento === "tamponamento" &&
                  selecao.tipo === "conjunto" &&
                  itensDaSelecao.length > 1 && (
                    <div>
                      <Label htmlFor="ec-modulo">Módulo do bloco</Label>
                      <Select value={moduloTamponamentoAtual} onValueChange={setModuloTamponamento}>
                        <SelectTrigger id="ec-modulo" className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {itensDaSelecao.map((itemId, idx) => (
                            <SelectItem key={itemId} value={itemId}>
                              {idx + 1}. {nomeDoItem(itemId)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                <div>
                  <Label htmlFor="ec-posicao">Posição</Label>
                  <Select
                    value={novaPosicaoElemento}
                    onValueChange={(v) => setNovaPosicaoElemento(v as PosicaoElemento)}
                  >
                    <SelectTrigger id="ec-posicao" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {posicoesDisponiveis.map((p) => (
                        <SelectItem key={p} value={p}>
                          {ROTULO_POSICAO_ELEMENTO[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ec-cor">Cor</Label>
                  <Select value={corElemento} onValueChange={setCorElemento}>
                    <SelectTrigger id="ec-cor" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalogo ? coresDisponiveis(catalogo) : ["Branco TX", "Madeirado"]).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ec-espessura">Espessura</Label>
                  <Select
                    value={String(espessuraElemento)}
                    onValueChange={(v) => setEspessuraElemento(numero(v))}
                  >
                    <SelectTrigger id="ec-espessura" className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalogo && corElemento ? espessurasDaCor(catalogo, corElemento) : [15, 18, 25]).map(
                        (esp) => (
                          <SelectItem key={esp} value={String(esp)}>
                            {esp} mm
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="primary" onClick={adicionarElementoContinuo}>
                  Adicionar
                </Button>
              </div>

              {elementosDaSelecao.length === 0 ? (
                <p className="text-corpo-pequeno text-cinza-500">
                  Nenhum elemento contínuo adicionado a este alvo ainda.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Posição</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Peças</TableHead>
                        <TableHead className="text-right">Área (m²)</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {elementosDaSelecao.map((elemento) => {
                        const resultado = resultadoElementosContinuos.porModulo.find(
                          (r) => r.moduloId === elemento.id
                        );
                        return (
                          <TableRow key={elemento.id}>
                            <TableCell>{ROTULO_TIPO_ELEMENTO_CONTINUO[elemento.tipo]}</TableCell>
                            <TableCell>{ROTULO_POSICAO_ELEMENTO[elemento.posicao]}</TableCell>
                            <TableCell>
                              {elemento.material.cor} · {elemento.material.espessura}mm
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {resultado?.pecas.length ?? "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {resultado?.areaMdfM2.toFixed(2) ?? "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removerElementoContinuo(elemento.id)}
                                aria-label={`Remover ${ROTULO_TIPO_ELEMENTO_CONTINUO[elemento.tipo]}`}
                              >
                                <X size={14} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  <div className="mt-3 flex flex-wrap gap-lg text-corpo-pequeno text-cinza-600">
                    <span>
                      Área MDF total:{" "}
                      <strong className="tabular-nums text-cinza-900">
                        {resultadoElementosContinuos.consolidado.mdf
                          .reduce((s, g) => s + g.area_m2, 0)
                          .toFixed(2)}{" "}
                        m²
                      </strong>
                    </span>
                    <span>
                      Fita total:{" "}
                      <strong className="tabular-nums text-cinza-900">
                        {resultadoElementosContinuos.consolidado.fitaTotalM.toFixed(2)} m
                      </strong>
                    </span>
                    {resultadoElementosContinuos.consolidado.ferragens.length > 0 && (
                      <span>
                        Ferragens:{" "}
                        <strong className="text-cinza-900">
                          {resultadoElementosContinuos.consolidado.ferragens
                            .map((f) => `${f.item} ×${f.quantidade}`)
                            .join(", ")}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <h2 className="mb-3 text-titulo-secao text-cinza-900">Validação (Tier 1 + Tier 2)</h2>
        {warnings.length === 0 ? (
          <Alert variant="sucesso">
            <AlertDescription>Nenhum problema encontrado.</AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-sm">
            {warnings.map((w, i) => (
              <Alert key={i} variant={w.severidade === "erro" ? "erro" : "aviso"}>
                <AlertDescription>{w.mensagem}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </section>

      {/* Task 13.3d — rodapé da aba: ação explícita de salvar (contrato:
          "NÃO autosave"). Qualquer mudança de estado acima limpa o feedback
          anterior (`setResultadoSalvar(null)`) pra não mostrar um "salvo com
          sucesso" desatualizado depois de editar algo. */}
      <section className="flex flex-col items-start gap-sm rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <Button variant="primary" onClick={handleSalvar} disabled={salvando}>
          {salvando ? "Salvando alterações…" : "Salvar alterações"}
        </Button>
        {resultadoSalvar && (
          <Alert variant={resultadoSalvar.ok ? "sucesso" : "erro"} className="w-full">
            <AlertDescription>
              {resultadoSalvar.ok
                ? "Alterações salvas com sucesso."
                : (resultadoSalvar.erro ?? "Não foi possível salvar as alterações.")}
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}
