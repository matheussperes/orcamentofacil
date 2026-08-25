"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ElementoParede } from "@/lib/engine/parede";
import { canonicoParaValor, valorParaCanonico, type ReferenciaX, type ReferenciaY } from "@/lib/engine/parede/referenciaMedida";
import type { ParedeComMeta } from "@/lib/ambiente/estado";
import { criarElementoParedePreset } from "@/lib/elemento-parede-preset/criar";
import { excluirElementoParedePreset } from "@/lib/elemento-parede-preset/excluir";
import type { ElementoParedePresetRow } from "@/lib/elemento-parede-preset/tipos";
import {
  aplicarPresetElementoParede,
  novoItemId,
  recalcularValorAoTrocarRef,
  salvarElementoNaLista,
} from "../AmbientesLab.helpers";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Formulário
 * de "adicionar/editar elemento de parede" (Task 2.7-2.12) — os dois
 * caminhos de entrada (lápis na lista, clique no 2D) convergem no mesmo
 * `elementoEditandoIndice`. */
export function useElementosParede(params: {
  parede: ParedeComMeta;
  setParede: Dispatch<SetStateAction<ParedeComMeta>>;
  presetsElementoParede: ElementoParedePresetRow[];
  marcarAlteracao: () => void;
}) {
  const { parede, setParede, presetsElementoParede, marcarAlteracao } = params;

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
    marcarAlteracao();
    limparFormularioElemento();
  }
  function removerElemento(indice: number) {
    setParede((p) => ({ ...p, elementos: p.elementos.filter((_, i) => i !== indice) }));
    if (elementoEditandoIndice === indice) limparFormularioElemento();
    marcarAlteracao();
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

  return {
    novoTipo,
    setNovoTipo,
    novoX,
    setNovoX,
    novoY,
    setNovoY,
    novaLargura,
    setNovaLargura,
    novaAltura,
    setNovaAltura,
    novoNome,
    setNovoNome,
    novoRefX,
    novoRefY,
    listaPresetsParede,
    presetParedeSelecionado,
    salvandoPreset,
    erroPreset,
    elementoEditandoIndice,
    mudarRefX,
    mudarRefY,
    limparFormularioElemento,
    editarElemento,
    salvarElemento,
    removerElemento,
    selecionarPresetParede,
    salvarComoPresetParede,
    excluirPresetParede,
  };
}
