"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  validarParedeTier1,
  validarParedeTier2,
  type AlturasFaixas,
  type ElementoParede,
  type Faixa,
  type ItemPosicionado,
  type Parede,
  type ResolvedorItens,
} from "@/lib/engine/parede";
import { aplicarOverrides, detectarConjuntos, type Conjunto, type OverrideJuncao } from "@/lib/engine/conjunto";
import type { EngineWarning } from "@/lib/engine/types";
import {
  alturaDoItem,
  calcularOrcamentoMisto,
  larguraDoItem,
  profundidadeDoItem,
  type ElementoContinuoResolvido,
  type ModuloOrcamento,
} from "@/lib/orcamento";
import { MATERIAIS_PADRAO, PARAMETROS_FABRICA_PADRAO } from "@/lib/engine/defaults";
import type { BoxMaterial } from "@/lib/engine/box/types";
import {
  POSICOES_VALIDAS,
  type AlvoElementoContinuo,
  type AlvoResolvido,
  type ElementoContinuo,
  type ModuloResolvido,
  type PosicaoElemento,
  type TipoElementoContinuo,
} from "@/lib/engine/elemento-continuo/types";
import { listarPresets, seedPresetsPadrao, type BoxPreset } from "@/lib/boxPresets";
import { carregarCatalogo, coresDisponiveis, espessurasDaCor, type Catalogo } from "@/lib/catalog";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — extraído de
// `app/ambientes/page.tsx` (Task 13.2a/b/c) para virar a aba "Ambientes" de
// `/orcamento/[id]` (componente reaproveitável, sem duplicar a lógica de
// desenho/validação) E continuar servindo o laboratório standalone
// `/ambientes` (`app/ambientes/page.tsx`, que agora só monta este
// componente dentro do header/wrap próprio dele).
//
// Nota de escopo (contrato, "NÃO reabrir sem reportar"): o estado profundo
// de Ambientes (parede, alturas de faixa, elementos de parede, itens
// posicionados, elementos contínuos, overrides de junção) CONTINUA só
// local — React state + localStorage — e NÃO é persistido nas tabelas
// Supabase (`ambiente`/`parede`/`elemento_continuo`, já existentes no
// schema) nesta task. Migrar isso pro banco é task futura dedicada, grande e
// que só o operador consegue testar E2E com sessão real (ver relatório da
// 13.3c). Só o CABEÇALHO do orçamento (cliente/prazo/status) persiste de
// verdade, via `lib/orcamento/criar.ts`.
//
// Diferença de escopo em relação à Task 13.2c: a chave de localStorage
// agora é PARAMETRIZADA por `chavePrefixo` (o id do orçamento, quando
// embutida em `/orcamento/[id]`, ou `"standalone"` para o laboratório
// `/ambientes`) — dois orçamentos não compartilham parede/itens/elementos
// entre si. E TODO o estado profundo passou a ser persistido em UM blob
// único (`ambientes:<chavePrefixo>:estado`), não só os overrides de junção
// como antes — necessário porque agora este componente vive dentro de uma
// aba (`components/orcamento/OrcamentoAbas.tsx`) e precisa sobreviver a
// navegação para fora e volta (ex.: o usuário sai pro Dashboard e volta)
// sem perder o que montou. As Tabs usam `forceMount` (não desmontam ao
// trocar de aba), então o localStorage aqui é uma rede de segurança para
// navegação de página inteira, não o mecanismo principal de continuidade
// entre abas.

const TIPOS_ELEMENTO: ElementoParede["tipo"][] = ["janela", "porta", "tomada", "ponto_hidraulico"];
const ROTULO_TIPO_ELEMENTO: Record<ElementoParede["tipo"], string> = {
  janela: "Janela",
  porta: "Porta",
  tomada: "Tomada",
  ponto_hidraulico: "Ponto hidráulico",
};
const FAIXAS: Faixa[] = ["inferior", "bancada", "aereo", "torre"];
const ROTULO_FAIXA: Record<Faixa, string> = {
  inferior: "Inferior",
  bancada: "Bancada",
  aereo: "Aéreo",
  torre: "Torre",
};

function paredeInicial(): Parede {
  return { id: "parede-1", largura: 3000, altura: 2700, elementos: [], itens: [] };
}

function alturasIniciais(): AlturasFaixas {
  return { alturaRodape: 100, alturaBancada: 900, alturaInstalacaoAereo: 1400, peDireito: 2700 };
}

// Cada item posicionado guarda um `itemId` de INSTÂNCIA sintético (não o id
// do preset) — decisão de design: `ResolvedorItens` é um `Map<itemId,
// ModuloOrcamento>` (chave única), então reaproveitar o id do preset como
// `itemId` impediria posicionar o MESMO preset duas vezes na parede (a
// segunda sobrescreveria a primeira no Map). `presetId` fica como metadado
// de UI (rótulo/rastreio), fora do `ItemPosicionado` que o motor enxerga.
interface ItemColocado {
  itemId: string;
  presetId: string;
  x: number;
  faixa: Faixa;
}

// Task 13.3c: ids gerados por timestamp+random (não mais um contador
// incremental em variável de módulo) — o estado agora sobrevive a reload
// via localStorage, e um contador reiniciando em 0 a cada carregamento de
// página colidiria com ids já persistidos (duas "instancia-1" diferentes).
// Mesma convenção de `lib/boxPresets.ts` (`Math.random().toString(36)`).
function novoItemId(): string {
  return `instancia-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function novoElementoId(): string {
  return `elemento-continuo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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

// Task 13.3c — persistência local unificada, escopada por `chavePrefixo`
// (ver nota de escopo no topo do arquivo).
interface EstadoAmbientePersistido {
  parede: Parede;
  alturas: AlturasFaixas;
  itensColocados: ItemColocado[];
  elementosContinuos: ElementoContinuo[];
  overrides: OverrideJuncao[];
}

function chaveEstado(chavePrefixo: string): string {
  return `ambientes:${chavePrefixo}:estado`;
}

function estadoPadrao(): EstadoAmbientePersistido {
  return {
    parede: paredeInicial(),
    alturas: alturasIniciais(),
    itensColocados: [],
    elementosContinuos: [],
    overrides: [],
  };
}

function carregarEstado(chavePrefixo: string): EstadoAmbientePersistido {
  if (typeof window === "undefined") return estadoPadrao();
  try {
    const bruto = window.localStorage.getItem(chaveEstado(chavePrefixo));
    if (!bruto) return estadoPadrao();
    const parsed = JSON.parse(bruto) as Partial<EstadoAmbientePersistido>;
    return {
      parede: parsed.parede ?? paredeInicial(),
      alturas: parsed.alturas ?? alturasIniciais(),
      itensColocados: parsed.itensColocados ?? [],
      elementosContinuos: parsed.elementosContinuos ?? [],
      overrides: parsed.overrides ?? [],
    };
  } catch {
    return estadoPadrao();
  }
}

export interface AmbientesLabProps {
  /** Escopo do localStorage (`ambientes:<chavePrefixo>:estado`) — o id do
   * orçamento quando embutido em `/orcamento/[id]`, ou `"standalone"` para o
   * laboratório `/ambientes`. */
  chavePrefixo: string;
}

export function AmbientesLab({ chavePrefixo }: AmbientesLabProps) {
  const [parede, setParede] = useState<Parede>(() => carregarEstado(chavePrefixo).parede);
  const [alturas, setAlturas] = useState<AlturasFaixas>(
    () => carregarEstado(chavePrefixo).alturas
  );
  const [presets, setPresets] = useState<BoxPreset[]>([]);
  const [itensColocados, setItensColocados] = useState<ItemColocado[]>(
    () => carregarEstado(chavePrefixo).itensColocados
  );

  const [novoTipo, setNovoTipo] = useState<ElementoParede["tipo"]>("janela");
  const [novoX, setNovoX] = useState(0);
  const [novoY, setNovoY] = useState(900);
  const [novaLargura, setNovaLargura] = useState(600);
  const [novaAltura, setNovaAltura] = useState(1000);

  const [presetSelecionado, setPresetSelecionado] = useState<string>("");
  const [faixaSelecionada, setFaixaSelecionada] = useState<Faixa>("inferior");
  const [xItem, setXItem] = useState(0);

  // Task 13.2b — overrides do handle de junção, local-first: inicializador
  // preguiçoso do `useState` (não um efeito de carga separado — ver
  // histórico do bug real de auditoria documentado em
  // `app/ambientes/page.tsx` antes desta extração, git log da Task 13.2b).
  const [overrides, setOverrides] = useState<OverrideJuncao[]>(
    () => carregarEstado(chavePrefixo).overrides
  );

  // Task 13.2c — catálogo (cores/espessuras disponíveis pro material do
  // Elemento Contínuo). Não é escopado por orçamento — é o catálogo da
  // organização inteira, igual ao resto do produto.
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);

  // Seleção de Conjunto/item avulso e os Elementos Contínuos adicionados
  // (local-first, mesmo espírito de `itensColocados`/`overrides` acima).
  const [selecao, setSelecao] = useState<SelecaoAlvo | null>(null);
  const [elementosContinuos, setElementosContinuos] = useState<ElementoContinuo[]>(
    () => carregarEstado(chavePrefixo).elementosContinuos
  );

  // Formulário de "adicionar elemento".
  const [novoTipoElemento, setNovoTipoElemento] = useState<TipoElementoContinuo>("tampo");
  const [novaPosicaoElemento, setNovaPosicaoElemento] = useState<PosicaoElemento>("superior");
  const [moduloTamponamento, setModuloTamponamento] = useState<string>("");
  const [corElemento, setCorElemento] = useState<string>("");
  const [espessuraElemento, setEspessuraElemento] = useState<number>(18);

  useEffect(() => {
    seedPresetsPadrao();
    const lista = listarPresets();
    setPresets(lista);
    if (lista[0]) setPresetSelecionado(lista[0].id);
    setCatalogo(carregarCatalogo());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persistência local unificada — um único blob por `chavePrefixo`, escrito
  // sempre que qualquer parte do estado profundo muda.
  useEffect(() => {
    const estado: EstadoAmbientePersistido = {
      parede,
      alturas,
      itensColocados,
      elementosContinuos,
      overrides,
    };
    window.localStorage.setItem(chaveEstado(chavePrefixo), JSON.stringify(estado));
  }, [chavePrefixo, parede, alturas, itensColocados, elementosContinuos, overrides]);

  function atualizarParede(patch: Partial<Parede>) {
    setParede((p) => ({ ...p, ...patch }));
  }
  function atualizarAlturas(patch: Partial<AlturasFaixas>) {
    setAlturas((a) => ({ ...a, ...patch }));
  }

  function adicionarElemento() {
    const elemento: ElementoParede = {
      tipo: novoTipo,
      x: novoX,
      y: novoY,
      largura: novaLargura,
      altura: novaAltura,
    };
    setParede((p) => ({ ...p, elementos: [...p.elementos, elemento] }));
  }
  function removerElemento(indice: number) {
    setParede((p) => ({ ...p, elementos: p.elementos.filter((_, i) => i !== indice) }));
  }

  function adicionarItem() {
    if (!presetSelecionado) return;
    const item: ItemColocado = {
      itemId: novoItemId(),
      presetId: presetSelecionado,
      x: xItem,
      faixa: faixaSelecionada,
    };
    setItensColocados((its) => [...its, item]);
  }
  function removerItem(itemId: string) {
    setItensColocados((its) => its.filter((i) => i.itemId !== itemId));
  }

  const resolvedor: ResolvedorItens = useMemo(() => {
    const m = new Map<string, ModuloOrcamento>();
    for (const ic of itensColocados) {
      const preset = presets.find((p) => p.id === ic.presetId);
      if (preset) m.set(ic.itemId, { origem: "custom_box", box: preset.box });
    }
    return m;
  }, [itensColocados, presets]);

  const paredeComItens: Parede = useMemo(
    () => ({
      ...parede,
      itens: itensColocados.map(
        (i): ItemPosicionado => ({ itemId: i.itemId, x: i.x, faixa: i.faixa })
      ),
    }),
    [parede, itensColocados]
  );

  // Tier 1 + Tier 2 rodam a cada mudança de posicionamento/parede/alturas
  // (useMemo recalcula sempre que qualquer dependência muda — não há botão
  // "validar", é reativo).
  const warnings: EngineWarning[] = useMemo(
    () => [
      ...validarParedeTier1(paredeComItens, resolvedor),
      ...validarParedeTier2(paredeComItens, alturas, resolvedor),
    ],
    [paredeComItens, alturas, resolvedor]
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
      itensColocados
        .map((ic) => {
          const item = resolvedor.get(ic.itemId);
          if (!item) return null;
          const posicao: ItemPosicionado = { itemId: ic.itemId, x: ic.x, faixa: ic.faixa };
          return { item, posicao };
        })
        .filter((v): v is ItemDoConjunto => v !== null),
    [itensColocados, resolvedor]
  );

  // Task 13.2b — Conjuntos automáticos (detecção pura, sem override) + finais
  // (override do handle de junção por cima). Nenhuma lógica de agrupamento é
  // reimplementada aqui — só consome `detectarConjuntos`/`aplicarOverrides`
  // (lib/engine/conjunto/detectar.ts, já testadas).
  const conjuntosAutomaticos = useMemo(
    () => detectarConjuntos(paredeComItens, alturas, resolvedor),
    [paredeComItens, alturas, resolvedor]
  );

  const conjuntosFinais = useMemo(
    () => aplicarOverrides(conjuntosAutomaticos, paredeComItens.itens, overrides),
    [conjuntosAutomaticos, paredeComItens.itens, overrides]
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
  }

  // Task 13.2c — itens que NÃO pertencem a nenhum Conjunto ("avulsos"): alvo
  // válido de Elemento Contínuo tanto quanto um Conjunto (Modelo de Domínio
  // 3.4 — `alvo: { conjuntoId } | { moduloId }`, "bloco ou módulo isolado").
  const idsEmConjunto = useMemo(
    () => new Set(conjuntosFinais.flatMap((c) => c.itensIds)),
    [conjuntosFinais]
  );
  const itensAvulsos: ItemColocado[] = useMemo(
    () => itensColocados.filter((ic) => !idsEmConjunto.has(ic.itemId)),
    [itensColocados, idsEmConjunto]
  );

  function nomeDoItem(itemId: string): string {
    const ic = itensColocados.find((i) => i.itemId === itemId);
    const preset = ic ? presets.find((p) => p.id === ic.presetId) : undefined;
    return preset?.nome ?? itemId;
  }

  function moduloResolvidoDe(itemId: string): ModuloResolvido | null {
    const modulo = resolvedor.get(itemId);
    if (!modulo) return null;
    return {
      largura: larguraDoItem(modulo),
      profundidade: profundidadeDoItem(modulo),
      altura: alturaDoItem(modulo),
    };
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

  function resolverAlvoElemento(elemento: ElementoContinuo): AlvoResolvido | null {
    if (elemento.tipo === "tamponamento") {
      if (!("moduloId" in elemento.alvo)) return null;
      const modulo = moduloResolvidoDe(elemento.alvo.moduloId);
      return modulo ? { moduloExtremidade: modulo } : null;
    }
    const alvo = elemento.alvo;
    const ids =
      "conjuntoId" in alvo
        ? (conjuntosFinais.find((c) => c.id === alvo.conjuntoId)?.itensIds ?? [])
        : [alvo.moduloId];
    const itens = ids
      .map(moduloResolvidoDe)
      .filter((m): m is ModuloResolvido => m !== null);
    return itens.length ? { itens } : null;
  }

  const elementosContinuosResolvidos: ElementoContinuoResolvido[] = useMemo(
    () =>
      elementosDaSelecao
        .map((elemento) => {
          const alvo = resolverAlvoElemento(elemento);
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
  }

  function removerElementoContinuo(id: string) {
    setElementosContinuos((els) => els.filter((e) => e.id !== id));
  }

  return (
    <div className="flex flex-col gap-lg">
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
          <h2 className="mb-3 text-titulo-secao text-cinza-900">Alturas do perfil</h2>
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
        <h2 className="mb-3 text-titulo-secao text-cinza-900">Elementos de parede</h2>
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
            <Label htmlFor="elemento-x">X (mm)</Label>
            <Input
              id="elemento-x"
              type="number"
              className="w-24"
              value={novoX}
              onChange={(e) => setNovoX(numero(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="elemento-y">Y (mm)</Label>
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
          <Button variant="primary" onClick={adicionarElemento}>
            Adicionar
          </Button>
        </div>

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
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {parede.elementos.map((el, i) => (
                  <TableRow key={i}>
                    <TableCell>{ROTULO_TIPO_ELEMENTO[el.tipo]}</TableCell>
                    <TableCell className="text-right tabular-nums">{el.x}</TableCell>
                    <TableCell className="text-right tabular-nums">{el.y}</TableCell>
                    <TableCell className="text-right tabular-nums">{el.largura}</TableCell>
                    <TableCell className="text-right tabular-nums">{el.altura}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removerElemento(i)}
                        aria-label={`Remover elemento ${ROTULO_TIPO_ELEMENTO[el.tipo]}`}
                      >
                        <X size={14} />
                      </Button>
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
            Nenhum preset disponível. Crie um módulo em{" "}
            <a href="/modulo" className="text-accent hover:underline">
              /modulo
            </a>{" "}
            e salve como preset da biblioteca.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-end gap-sm">
              <div>
                <Label htmlFor="item-preset">Preset</Label>
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
                <Label htmlFor="item-x">X (mm)</Label>
                <Input
                  id="item-x"
                  type="number"
                  className="w-24"
                  value={xItem}
                  onChange={(e) => setXItem(numero(e.target.value))}
                />
              </div>
              <Button variant="primary" onClick={adicionarItem}>
                Adicionar
              </Button>
            </div>

            {itensColocados.length === 0 ? (
              <p className="text-corpo-pequeno text-cinza-500">Nenhum item posicionado ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Preset</TableHead>
                      <TableHead>Faixa</TableHead>
                      <TableHead className="text-right">X</TableHead>
                      <TableHead className="text-right">Largura</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itensColocados.map((ic) => {
                      const preset = presets.find((p) => p.id === ic.presetId);
                      const modulo = resolvedor.get(ic.itemId);
                      const severidade = itensComAviso.get(ic.itemId);
                      return (
                        <TableRow
                          key={ic.itemId}
                          className={
                            severidade === "erro"
                              ? "bg-erro-subtle"
                              : severidade === "aviso"
                                ? "bg-aviso-subtle"
                                : undefined
                          }
                        >
                          <TableCell>{preset?.nome ?? "—"}</TableCell>
                          <TableCell>{ROTULO_FAIXA[ic.faixa]}</TableCell>
                          <TableCell className="text-right tabular-nums">{ic.x}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {modulo ? larguraDoItem(modulo) : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerItem(ic.itemId)}
                              aria-label={`Remover item ${preset?.nome ?? ic.itemId}`}
                            >
                              <X size={14} />
                            </Button>
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
            <ElevacaoParede parede={parede} alturas={alturas} />
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
                  {itensAvulsos.map((ic) => {
                    const selecionado = selecao?.tipo === "item" && selecao.itemId === ic.itemId;
                    return (
                      <TableRow
                        key={ic.itemId}
                        className={`cursor-pointer ${selecionado ? "bg-accent-subtle" : ""}`}
                        onClick={() => setSelecao({ tipo: "item", itemId: ic.itemId })}
                      >
                        <TableCell>{nomeDoItem(ic.itemId)} (avulso)</TableCell>
                        <TableCell>{ROTULO_FAIXA[ic.faixa]}</TableCell>
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
    </div>
  );
}
