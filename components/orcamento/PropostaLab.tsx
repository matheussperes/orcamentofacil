"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatarDataHora } from "@/lib/format";
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
import { valorAtualDaLinha as calcularValorAtualDaLinha } from "@/lib/linha-proposta/valorAtual";
import { gerarProposta } from "@/lib/linha-proposta/gerarProposta";
import type {
  LinhaProposta,
  PatchLinhaProposta,
  ResultadoLinhaProposta,
  ResultadoOperacaoLinhaProposta,
} from "@/lib/linha-proposta/tipos";
import { LinhaPropostaCard, type ItemDisponivel } from "./LinhaPropostaCard";
import { useIrParaAba } from "./AbaAtivaContext";

// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — componente
// PRESENTACIONAL da aba "Proposta" (mesmo espírito de `CorteMaterialLab.tsx`/
// `FinanceiroLab.tsx`): recebe o `EstadoAmbiente` já carregado (a MESMA
// leitura das outras 3 abas) + a `ConfiguracaoPrecificacaoCarregada` (Task
// 13.5, reaproveitada sem duplicar) + as `linhasIniciais` já carregadas/
// criadas no servidor (`lib/linha-proposta/carregar.ts`) e liga de verdade
// `ratearPrecificacao` a GRUPOS REAIS (um `GrupoItens` por Linha de Proposta)
// — RESOLVE A DÍVIDA B2 de vez (Task 13.5 usava um grupo único trivial,
// documentado como provisório em `FinanceiroLab.tsx`, que esta task NÃO
// altera — ele continua com o grupo único de propósito, ver contrato).
//
// Toda escrita (criar/atualizar/excluir linha, regenerar imagem, resolver
// URL de exibição) é injetada via props — este componente não sabe de
// Supabase (`PropostaTabConectada`/`PropostaTabMock` decidem a implementação
// real, mesmo padrão das outras 3 abas).
export interface PropostaLabProps {
  orcamentoId: string;
  estadoInicial: EstadoAmbiente;
  configuracaoInicial: ConfiguracaoPrecificacaoCarregada;
  linhasIniciais: LinhaProposta[];
  // Task 0.7b (Modelo-de-Dominio.md 5.4.1) — única fonte de verdade de
  // congelamento (I1); `null` = nunca congelado / reaberto (R1, ao vivo).
  congeladoEm: string | null;
  // Task 1.9-front (Design-System.md §7.13.1, Q-18) — papel do usuário
  // logado nesta organização; só `"admin"` vê o botão "Reabrir orçamento"
  // no `Alert` de orçamento congelado.
  papel: string | null;
  onCriarLinha: (titulo: string, itens: string[], descricao: string) => Promise<ResultadoLinhaProposta>;
  onAtualizarLinha: (id: string, patch: PatchLinhaProposta) => Promise<ResultadoOperacaoLinhaProposta>;
  onExcluirLinha: (id: string) => Promise<ResultadoOperacaoLinhaProposta>;
  onRegenerarImagem: (
    linhaId: string,
    blob: Blob
  ) => Promise<{ ok: true; imagemUrl: string } | { ok: false; erro: string }>;
  onResolverUrlImagem: (imagemUrl: string) => Promise<string | null>;
  onCongelarOrcamento: (orcamentoId: string) => Promise<ResultadoOperacaoLinhaProposta>;
  onReabrirOrcamento: (orcamentoId: string) => Promise<ResultadoOperacaoLinhaProposta>;
}

export function PropostaLab({
  orcamentoId,
  estadoInicial,
  configuracaoInicial,
  linhasIniciais,
  congeladoEm: congeladoEmInicial,
  papel,
  onCriarLinha,
  onAtualizarLinha,
  onExcluirLinha,
  onRegenerarImagem,
  onResolverUrlImagem,
  onCongelarOrcamento,
  onReabrirOrcamento,
}: PropostaLabProps) {
  const irParaAba = useIrParaAba();
  const router = useRouter();

  // Task 1.9-front — estado local pra que `congeladoEm` volte a `null` na
  // tela sem F5 depois de reabrir (mesmo padrão de estado local espelhando
  // prop inicial já usado em `linhas`/`linhasIniciais` acima).
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
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [criandoLinhaInicial, setCriandoLinhaInicial] = useState(false);

  const modulosPorItemId = useMemo(() => {
    const m = new Map<string, ModuloOrcamento>();
    for (const modulo of estadoInicial.modulos) m.set(idDoItem(modulo), modulo);
    return m;
  }, [estadoInicial.modulos]);

  const posicoesPorItemId = useMemo(() => {
    const m = new Map<string, ItemPosicionado>();
    for (const posicao of estadoInicial.parede.itens) m.set(posicao.itemId, posicao);
    return m;
  }, [estadoInicial.parede.itens]);

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
    setValoresOverride(null);
    return { ok: true as const };
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

  if (!resultadoEngine.ok) {
    return (
      <Alert variant="erro">
        <AlertDescription>
          Não foi possível calcular a proposta deste orçamento. Volte para a aba Ambientes e confira a
          configuração dos itens posicionados.
        </AlertDescription>
      </Alert>
    );
  }

  if (resultadoEngine.engine.porModulo.length === 0) {
    return (
      <div className="flex flex-col items-center gap-sm rounded-lg border border-cinza-200 bg-cinza-0 p-xl py-3xl text-center shadow-xs">
        <FileText className="h-8 w-8 text-cinza-300" aria-hidden="true" />
        <h2 className="text-titulo-card text-cinza-700">Nenhum item para propor ainda</h2>
        <p className="max-w-sm text-corpo-pequeno text-cinza-500">
          As linhas de proposta são criadas a partir dos itens posicionados na aba Ambientes. Adicione
          ao menos um item para gerar a proposta aqui.
        </p>
        <Button variant="primary" onClick={() => irParaAba("ambientes")}>
          Ir para Ambientes
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      {congeladoEm !== null && (
        <Alert variant="aviso">
          <AlertTriangle className="h-4 w-4 text-aviso" aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-sm">
            <span>
              Esta proposta está congelada desde {formatarDataHora(congeladoEm)}. Suas alterações não
              mudam os valores até você reabrir o orçamento.
            </span>
            {papel === "admin" && (
              <Button variant="ghost" size="sm" onClick={() => setDialogReabrirAberto(true)}>
                Reabrir orçamento
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Alert variant="informacao">
        <AlertDescription>
          Remover um ambiente aumenta o preço dos demais; regenere a proposta depois de dividir, mesclar
          ou editar o valor de uma linha.
        </AlertDescription>
      </Alert>

      {linhas.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-lg border border-cinza-200 bg-cinza-0 p-xl py-3xl text-center shadow-xs">
          <FileText className="h-8 w-8 text-cinza-300" aria-hidden="true" />
          <h2 className="text-titulo-card text-cinza-700">Nenhuma linha de proposta ainda</h2>
          <p className="max-w-sm text-corpo-pequeno text-cinza-500">
            Crie a primeira linha cobrindo todos os itens deste orçamento — depois é possível dividir ou
            mesclar linhas.
          </p>
          <Button variant="primary" onClick={handleCriarLinhaInicial} disabled={criandoLinhaInicial}>
            {criandoLinhaInicial ? "Criando…" : "Criar linha de proposta"}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-lg">
            {linhas.map((linha) => (
              <LinhaPropostaCard
                key={linha.id}
                linha={linha}
                alturas={estadoInicial.alturas}
                itensDoConjunto={itensDoConjuntoDaLinha(linha)}
                itensDisponiveis={itensDisponiveisDaLinha(linha)}
                valorAtual={valorAtualDaLinha(linha)}
                mostrarSelecaoMesclar={linhas.length > 1}
                selecionadaParaMesclar={selecionadasParaMesclar.has(linha.id)}
                onToggleSelecaoMesclar={() => toggleSelecaoMesclar(linha.id)}
                onSalvarTextos={(patch) => handleSalvarTextos(linha.id, patch)}
                onOverrideValor={(novoValor) => handleOverrideValor(linha.id, novoValor)}
                onDividir={(itemIds) => handleDividirLinha(linha, itemIds)}
                onRegenerarImagem={(blob) => handleRegenerarImagem(linha.id, blob)}
                onResolverUrlImagem={onResolverUrlImagem}
              />
            ))}
          </div>

          {selecionadasParaMesclar.size >= 2 && (
            <div className="flex justify-start">
              <Button variant="primary" onClick={handleMesclarSelecionadas}>
                Mesclar {selecionadasParaMesclar.size} linhas selecionadas
              </Button>
            </div>
          )}

          {resultadoRateio.ok && resultadoRateio.snapshot.warnings.length > 0 && (
            <Alert variant="aviso">
              <AlertDescription>
                {resultadoRateio.snapshot.warnings.length} aviso(s) no rateio por linha: itens fora de
                qualquer Linha de Proposta não entram no valor rateado. Divida ou edite as linhas para
                incluí-los.
              </AlertDescription>
            </Alert>
          )}

          <section className="flex flex-col items-start gap-sm rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
            <Button variant="primary" onClick={handleGerarProposta} disabled={gerandoProposta}>
              {gerandoProposta ? "Gerando…" : "Gerar proposta"}
            </Button>
            {erroGeral && (
              <Alert variant="erro" className="w-full">
                <AlertDescription>{erroGeral}</AlertDescription>
              </Alert>
            )}
          </section>
        </>
      )}

      <Dialog
        open={dialogReabrirAberto}
        onOpenChange={(aberto) => {
          setDialogReabrirAberto(aberto);
          if (aberto) setErroReabrir(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir orçamento?</DialogTitle>
          </DialogHeader>
          <p className="text-corpo-pequeno text-cinza-500">
            Os valores desta proposta voltam a ser recalculados a cada alteração até você congelar de
            novo. O valor atual congelado deixa de ser exibido.
          </p>
          {erroReabrir && (
            <Alert variant="erro">
              <AlertDescription>{erroReabrir}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogReabrirAberto(false)} disabled={reabrindo}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmarReabrir} disabled={reabrindo}>
              {reabrindo ? "Reabrindo…" : "Reabrir orçamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
