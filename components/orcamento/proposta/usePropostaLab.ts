"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { calcularEngineOrcamento } from "@/lib/ambiente/calcularEngineOrcamento";
import { carregarCatalogo, catalogoParaPrecos, type Catalogo } from "@/lib/catalog";
import { PRECOS_REFERENCIA } from "@/lib/engine/prices";
import { ratearPrecificacao, rebalancearLinhas, type GrupoItens } from "@/lib/engine/precificacao";
import type { EstadoAmbiente } from "@/lib/ambiente/estado";
import type { ItemPosicionado } from "@/lib/engine/parede";
import type { ConfiguracaoPrecificacaoCarregada } from "@/lib/precificacao/carregarConfiguracao";
import { idDoItem, nomeDoItem, type ModuloOrcamento } from "@/lib/orcamento";
import type { ItemDoConjunto } from "@/app/components/BoxCanvas";
import { gerarDescricaoLinha } from "@/lib/linha-proposta/descricao";
import { ambientesDaLinha } from "@/lib/linha-proposta/ambientes";
import { valorAtualDaLinha as calcularValorAtualDaLinha } from "@/lib/linha-proposta/valorAtual";
import { gerarProposta } from "@/lib/linha-proposta/gerarProposta";
import type {
  LinhaProposta,
  PatchLinhaProposta,
  ResultadoLinhaProposta,
  ResultadoOperacaoLinhaProposta,
} from "@/lib/linha-proposta/tipos";
import type { ItemDisponivel } from "../LinhaPropostaCard";

export interface UsePropostaLabArgs {
  orcamentoId: string;
  estadoInicial: EstadoAmbiente;
  configuracaoInicial: ConfiguracaoPrecificacaoCarregada;
  linhasIniciais: LinhaProposta[];
  congeladoEm: string | null;
  onCriarLinha: (titulo: string, itens: string[], descricao: string) => Promise<ResultadoLinhaProposta>;
  onAtualizarLinha: (id: string, patch: PatchLinhaProposta) => Promise<ResultadoOperacaoLinhaProposta>;
  onExcluirLinha: (id: string) => Promise<ResultadoOperacaoLinhaProposta>;
  onRegenerarImagem: (
    linhaId: string,
    blob: Blob
  ) => Promise<{ ok: true; imagemUrl: string } | { ok: false; erro: string }>;
  onCongelarOrcamento: (orcamentoId: string) => Promise<ResultadoOperacaoLinhaProposta>;
  onReabrirOrcamento: (orcamentoId: string) => Promise<ResultadoOperacaoLinhaProposta>;
}

/** Task R.5a — extraído de `PropostaLab.tsx` (decomposição pura, teto de 400
 * linhas/arquivo, apresentação separada de lógica): todo o estado e os
 * handlers da aba "Proposta" vivem aqui; `PropostaLab.tsx` só compõe JSX a
 * partir do retorno deste hook. Zero mudança de comportamento (Task 13.6a). */
export function usePropostaLab({
  orcamentoId,
  estadoInicial,
  configuracaoInicial,
  linhasIniciais,
  congeladoEm: congeladoEmInicial,
  onCriarLinha,
  onAtualizarLinha,
  onExcluirLinha,
  onRegenerarImagem,
  onCongelarOrcamento,
  onReabrirOrcamento,
}: UsePropostaLabArgs) {
  const router = useRouter();

  // Task 1.9-front — estado local pra que `congeladoEm` volte a `null` na
  // tela sem F5 depois de reabrir (mesmo padrão de estado local espelhando
  // prop inicial já usado em `linhas`/`linhasIniciais` abaixo).
  const [congeladoEm, setCongeladoEm] = useState<string | null>(congeladoEmInicial);
  const [dialogReabrirAberto, setDialogReabrirAberto] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);
  const [erroReabrir, setErroReabrir] = useState<string | null>(null);

  async function handleConfirmarReabrir() {
    setReabrindo(true);
    setErroReabrir(null);
    const resultado = await onReabrirOrcamento(orcamentoId);
    setReabrindo(false);
    if (!resultado.ok) {
      setErroReabrir(resultado.erro ?? "Não foi possível reabrir o orçamento.");
      return;
    }
    setDialogReabrirAberto(false);
    setCongeladoEm(null);
    router.refresh();
  }

  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  useEffect(() => {
    setCatalogo(carregarCatalogo());
  }, []);
  const precos = catalogo ? catalogoParaPrecos(catalogo) : PRECOS_REFERENCIA;

  const resultadoEngine = useMemo(() => calcularEngineOrcamento(estadoInicial), [estadoInicial]);

  const [linhas, setLinhas] = useState<LinhaProposta[]>(linhasIniciais);
  // Overrides manuais ainda não refletidos no `valorRateado` persistido em
  // cada linha — `null` = "nenhum override ativo, mostra o rateio ao vivo".
  // Resetado explicitamente (não via useEffect amplo) toda vez que o
  // CONJUNTO de itens de alguma linha muda (split/mesclar/criação) — ver
  // `handleDividirLinha`/`handleMesclarSelecionadas` — porque o peso de
  // custo alocado de cada linha mudou, tornando os overrides anteriores sem
  // sentido matemático.
  const [valoresOverride, setValoresOverride] = useState<Record<string, number> | null>(null);
  const [selecionadasParaMesclar, setSelecionadasParaMesclar] = useState<Set<string>>(new Set());
  // Rastro efêmero (só nesta sessão do componente, não persistido — ver
  // contrato Task 2.31: schema não tem `linha_mae_id`) de qual linha nova
  // nasceu de qual linha mãe via "Dividir linha", pra habilitar "Cancelar
  // divisão" sem exigir seleção manual + "Mesclar".
  const [origemSplit, setOrigemSplit] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [criandoLinhaInicial, setCriandoLinhaInicial] = useState(false);

  const modulosPorItemId = useMemo(() => {
    const m = new Map<string, ModuloOrcamento>();
    for (const modulo of estadoInicial.modulos) m.set(idDoItem(modulo), modulo);
    return m;
  }, [estadoInicial.modulos]);

  // Task 2.3-2.6 — [V2.1] fim do singleton: `itemId` é achatado por TODAS as
  // paredes de TODOS os ambientes (globalmente único, ver `lib/ambiente/
  // estado.ts`), mesmo padrão de `lib/ambiente/calcularEngineOrcamento.ts`.
  const posicoesPorItemId = useMemo(() => {
    const m = new Map<string, ItemPosicionado>();
    for (const ambiente of estadoInicial.ambientes) {
      for (const parede of ambiente.paredes) {
        for (const posicao of parede.itens) m.set(posicao.itemId, posicao);
      }
    }
    return m;
  }, [estadoInicial.ambientes]);

  function itensDoConjuntoDaLinha(linha: LinhaProposta): ItemDoConjunto[] {
    return linha.itens
      .map((itemId) => {
        const item = modulosPorItemId.get(itemId);
        const posicao = posicoesPorItemId.get(itemId);
        return item && posicao ? { item, posicao } : null;
      })
      .filter((v): v is ItemDoConjunto => v !== null);
  }

  function itensDisponiveisDaLinha(linha: LinhaProposta): ItemDisponivel[] {
    return linha.itens
      .map((itemId) => {
        const item = modulosPorItemId.get(itemId);
        return item ? { itemId, nome: nomeDoItem(item) } : null;
      })
      .filter((v): v is ItemDisponivel => v !== null);
  }

  // Task 2.32 — caption "Ambiente: X" (vínculo visual da linha com o(s)
  // ambiente(s) de origem, derivado sempre dos itens ATUAIS da linha, nunca
  // rastreado — ver `lib/linha-proposta/ambientes.ts`).
  function nomesAmbientesDaLinha(linha: LinhaProposta): string[] {
    return ambientesDaLinha(linha.itens, estadoInicial.ambientes);
  }

  // Wiring real do rateio (contrato: "fecha a Dívida B2 de vez") — um
  // `GrupoItens` por Linha de Proposta, nunca mais o grupo único trivial.
  const grupos: GrupoItens[] = useMemo(() => linhas.map((l) => ({ id: l.id, itemIds: l.itens })), [linhas]);

  const resultadoRateio = useMemo(() => {
    if (!resultadoEngine.ok) return { ok: false as const };
    try {
      const snapshot = ratearPrecificacao(resultadoEngine.engine, grupos, configuracaoInicial.config, precos);
      return { ok: true as const, snapshot };
    } catch (erro) {
      console.error("[proposta] falha ao ratear precificação por linha:", erro);
      return { ok: false as const };
    }
  }, [resultadoEngine, grupos, configuracaoInicial.config, precos]);

  function valorAtualDaLinha(linha: LinhaProposta): number {
    const valorAoVivo = resultadoRateio.ok
      ? resultadoRateio.snapshot.grupos.find((g) => g.id === linha.id)?.valorRateado ?? 0
      : 0;
    return calcularValorAtualDaLinha({ linha, congeladoEm, valoresOverride, valorAoVivo });
  }

  async function handleSalvarTextos(linhaId: string, patch: { titulo?: string; descricao?: string }) {
    const resultado = await onAtualizarLinha(linhaId, patch);
    if (resultado.ok) {
      setLinhas((atuais) => atuais.map((l) => (l.id === linhaId ? { ...l, ...patch } : l)));
    }
    return resultado;
  }

  function handleOverrideValor(linhaId: string, novoValor: number) {
    if (!resultadoRateio.ok) return;
    const precoFinal = resultadoRateio.snapshot.resumo.precoFinal;
    const atuais = linhas.map((l) => ({ id: l.id, valorRateado: valorAtualDaLinha(l) }));
    const rebalanceadas = rebalancearLinhas(atuais, linhaId, novoValor, precoFinal);
    setValoresOverride(Object.fromEntries(rebalanceadas.map((l) => [l.id, l.valorRateado])));
    // Persistência incremental (contrato: "já são persistidos incrementalmente
    // conforme o rateio roda") — decisão documentada em `rebalancear.ts` e
    // aqui: persiste no exato momento em que um rebalanceamento REALMENTE
    // roda (esta ação do usuário), não a cada leitura do valor computado
    // automaticamente (que nunca muda o dado em si, só é a leitura ao vivo
    // do rateio) — evita escritas redundantes a cada render.
    for (const l of rebalanceadas) {
      onAtualizarLinha(l.id, { valorRateado: l.valorRateado }).then((r) => {
        if (!r.ok) setErroGeral(r.erro ?? "Não foi possível salvar o valor rebalanceado de uma das linhas.");
      });
    }
  }

  async function handleDividirLinha(linha: LinhaProposta, itemIdsSelecionados: string[]) {
    const restantes = linha.itens.filter((id) => !itemIdsSelecionados.includes(id));
    if (itemIdsSelecionados.length === 0 || restantes.length === 0) {
      return { ok: false, erro: "Selecione ao menos um item, sem esvaziar a linha original." };
    }
    const modulosSelecionados = itemIdsSelecionados
      .map((id) => modulosPorItemId.get(id))
      .filter((m): m is ModuloOrcamento => m !== undefined);
    const descricaoNova = gerarDescricaoLinha(modulosSelecionados);
    const resultadoCriar = await onCriarLinha("Nova linha", itemIdsSelecionados, descricaoNova);
    if (!resultadoCriar.ok) return resultadoCriar;
    const resultadoAtualizar = await onAtualizarLinha(linha.id, { itens: restantes });
    if (!resultadoAtualizar.ok) return resultadoAtualizar;
    setLinhas((atuais) => [
      ...atuais.map((l) => (l.id === linha.id ? { ...l, itens: restantes } : l)),
      resultadoCriar.linha,
    ]);
    setOrigemSplit((atuais) => ({ ...atuais, [resultadoCriar.linha.id]: linha.id }));
    setValoresOverride(null);
    return { ok: true as const };
  }

  async function handleReverterDivisao(novaLinhaId: string) {
    const linhaMaeId = origemSplit[novaLinhaId];
    if (!linhaMaeId) return;
    const nova = linhas.find((l) => l.id === novaLinhaId);
    const mae = linhas.find((l) => l.id === linhaMaeId);
    if (!nova || !mae) {
      setErroGeral("A linha mãe desta divisão não existe mais. Use \"Mesclar\" se quiser unir linhas manualmente.");
      return;
    }
    const itensUnidos = Array.from(new Set([...mae.itens, ...nova.itens]));
    const resultadoAtualizar = await onAtualizarLinha(linhaMaeId, { itens: itensUnidos });
    if (!resultadoAtualizar.ok) {
      setErroGeral(resultadoAtualizar.erro ?? "Não foi possível reverter a divisão desta linha.");
      return;
    }
    const resultadoExcluir = await onExcluirLinha(novaLinhaId);
    if (!resultadoExcluir.ok) {
      setErroGeral(resultadoExcluir.erro ?? "Não foi possível remover a linha nova ao reverter a divisão.");
      return;
    }
    setLinhas((atuais) =>
      atuais
        .filter((l) => l.id !== novaLinhaId)
        .map((l) => (l.id === linhaMaeId ? { ...l, itens: itensUnidos } : l))
    );
    setOrigemSplit((atuais) => {
      const { [novaLinhaId]: _removida, ...resto } = atuais;
      return resto;
    });
    setValoresOverride(null);
  }

  async function handleMesclarSelecionadas() {
    const selecionadas = linhas.filter((l) => selecionadasParaMesclar.has(l.id));
    if (selecionadas.length < 2) return;
    const [alvo, ...restantes] = selecionadas;
    const itensUnidos = Array.from(new Set(selecionadas.flatMap((l) => l.itens)));
    const tituloUnido = selecionadas.map((l) => l.titulo).join(" + ");
    const resultadoAtualizar = await onAtualizarLinha(alvo.id, { itens: itensUnidos, titulo: tituloUnido });
    if (!resultadoAtualizar.ok) {
      setErroGeral(resultadoAtualizar.erro ?? "Não foi possível mesclar as linhas selecionadas.");
      return;
    }
    for (const l of restantes) {
      const resultadoExcluir = await onExcluirLinha(l.id);
      if (!resultadoExcluir.ok) {
        setErroGeral(resultadoExcluir.erro ?? "Não foi possível remover uma das linhas mescladas.");
      }
    }
    const idsRemovidos = new Set(restantes.map((l) => l.id));
    setLinhas((atuais) =>
      atuais
        .filter((l) => !idsRemovidos.has(l.id))
        .map((l) => (l.id === alvo.id ? { ...l, itens: itensUnidos, titulo: tituloUnido } : l))
    );
    setSelecionadasParaMesclar(new Set());
    setValoresOverride(null);
  }

  function toggleSelecaoMesclar(linhaId: string) {
    setSelecionadasParaMesclar((atuais) => {
      const novo = new Set(atuais);
      if (novo.has(linhaId)) novo.delete(linhaId);
      else novo.add(linhaId);
      return novo;
    });
  }

  async function handleRegenerarImagem(linhaId: string, blob: Blob) {
    const resultado = await onRegenerarImagem(linhaId, blob);
    if (resultado.ok) {
      setLinhas((atuais) => atuais.map((l) => (l.id === linhaId ? { ...l, imagemUrl: resultado.imagemUrl } : l)));
    }
    return resultado;
  }

  async function handleCriarLinhaInicial() {
    if (!resultadoEngine.ok) return;
    setCriandoLinhaInicial(true);
    const itemIds = resultadoEngine.engine.porModulo.map((m) => m.moduloId);
    const modulos = itemIds.map((id) => modulosPorItemId.get(id)).filter((m): m is ModuloOrcamento => m !== undefined);
    const resultado = await onCriarLinha("Linha 1", itemIds, gerarDescricaoLinha(modulos));
    setCriandoLinhaInicial(false);
    if (resultado.ok) setLinhas((atuais) => [...atuais, resultado.linha]);
    else setErroGeral(resultado.erro);
  }

  const [gerandoProposta, setGerandoProposta] = useState(false);
  async function handleGerarProposta() {
    setGerandoProposta(true);
    setErroGeral(null);
    // Persiste o `valorRateado` atual de cada linha e SÓ DEPOIS congela o
    // orçamento (`congeladoEm`) — ordem atômica exigida pelo Modelo 5.4.1
    // (invariante I1/I2): falha em qualquer uma das duas etapas não deixa o
    // orçamento congelado nem navega. Orquestração pura em
    // `lib/linha-proposta/gerarProposta.ts` (testável sem infra de render).
    const resultado = await gerarProposta({
      orcamentoId,
      linhas: linhas.map((l) => ({ id: l.id, valorRateado: valorAtualDaLinha(l) })),
      onAtualizarLinha,
      onCongelarOrcamento,
    });
    setGerandoProposta(false);
    if (!resultado.ok) {
      setErroGeral(resultado.erro ?? "Não foi possível congelar a proposta. Tente novamente.");
      return;
    }
    // Task 13.6b (fora de escopo desta task) constrói `/proposta/[id]/pdf` de
    // verdade — aqui só o botão + navegação, como pedido pelo contrato.
    router.push(`/proposta/${orcamentoId}/pdf`);
  }

  return {
    resultadoEngine,
    linhas,
    congeladoEm,
    resultadoRateio,
    selecionadasParaMesclar,
    origemSplit,
    erroGeral,
    criandoLinhaInicial,
    gerandoProposta,
    dialogReabrirAberto,
    setDialogReabrirAberto,
    erroReabrir,
    setErroReabrir,
    reabrindo,
    itensDoConjuntoDaLinha,
    itensDisponiveisDaLinha,
    valorAtualDaLinha,
    nomesAmbientesDaLinha,
    handleSalvarTextos,
    handleOverrideValor,
    handleDividirLinha,
    handleReverterDivisao,
    handleMesclarSelecionadas,
    toggleSelecaoMesclar,
    handleRegenerarImagem,
    handleCriarLinhaInicial,
    handleGerarProposta,
    handleConfirmarReabrir,
  };
}
