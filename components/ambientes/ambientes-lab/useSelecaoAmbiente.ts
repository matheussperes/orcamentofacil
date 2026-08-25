"use client";

import { useState } from "react";
import type {
  AmbienteItem,
  ComandoAmbiente,
  EstadoAmbiente,
  ParedeComMeta,
  ResultadoMutarAmbientes,
} from "@/lib/ambiente/estado";
import { aplicarComandoAmbiente } from "@/lib/ambiente/estado";
import type { Parede } from "@/lib/engine/parede";
import type { ModuloOrcamento } from "@/lib/orcamento";
import {
  ambientesGarantidos,
  encontrarParede,
  moverIdNaLista,
  novoIdLocal,
  substituirParedeNaLista,
} from "../AmbientesLab.helpers";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Dono da
 * árvore de ambientes/paredes e da parede selecionada (cópia de trabalho em
 * edição), do CRUD imediato (criar/renomear/excluir/reordenar) e da troca de
 * seleção. `aoTrocarSelecao` é chamado sempre que a seleção de
 * ambiente/parede muda de fato — quem chama este hook decide o que resetar
 * (seleção de Conjunto, formulário de elemento de parede, feedback de
 * salvamento). */
export function useSelecaoAmbiente(params: {
  estadoInicial: EstadoAmbiente;
  onMutarAmbientes?: (comando: ComandoAmbiente) => Promise<ResultadoMutarAmbientes>;
  marcarAlteracao: () => void;
  aoTrocarSelecao: () => void;
}) {
  const { estadoInicial, onMutarAmbientes, marcarAlteracao, aoTrocarSelecao } = params;

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

  function atualizarParede(patch: Partial<Parede>) {
    setParede((p) => ({ ...p, ...patch }));
    marcarAlteracao();
  }

  // Task 2.3-2.6 — troca de seleção de ambiente/parede: sempre grava a cópia
  // de trabalho ATUAL (`parede`) de volta em `ambientes` antes de trocar, e só
  // então carrega a nova seleção — nenhum dado de edição em progresso (ainda
  // não salvo pelo botão "Salvar alterações") se perde ao navegar entre
  // paredes.
  function selecionarParede(novaParedeId: string) {
    if (novaParedeId === paredeSelecionadaId) return;
    const listaAtualizada = substituirParedeNaLista(ambientes, ambienteSelecionadoId, parede);
    const novaParede = encontrarParede(listaAtualizada, ambienteSelecionadoId, novaParedeId);
    setAmbientes(listaAtualizada);
    if (novaParede) setParede(novaParede);
    setParedeSelecionadaId(novaParedeId);
    aoTrocarSelecao();
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
    aoTrocarSelecao();
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
      aoTrocarSelecao();
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

  return {
    ambientes,
    setAmbientes,
    ambienteSelecionadoId,
    setAmbienteSelecionadoId,
    paredeSelecionadaId,
    setParedeSelecionadaId,
    parede,
    setParede,
    modulos,
    setModulos,
    ambienteSelecionado,
    comandoEmVoo,
    erroComando,
    atualizarParede,
    selecionarAmbiente,
    selecionarParede,
    moverAmbiente,
    moverParede,
    executarComandoAmbiente,
  };
}
