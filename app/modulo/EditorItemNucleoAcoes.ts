// Task R.3c — decomposição pura de `EditorItemNucleo.tsx`: handlers que
// mutam o estado de `EditorItemNucleoEstado.ts`, extraídos sem nenhuma
// mudança de comportamento.

import type { LadoPlaca, Placa } from "@/lib/engine/placa/types";
import { acharVao, definirConteudo, dividirVao, excluirDivisoria } from "@/lib/engine/box/tree";
import { vaoVazio, type BoxModule, type GrupoPortas } from "@/lib/engine/box";
import type { ModuloOrcamento } from "@/lib/orcamento";
import type { ConfigDivisao } from "./DivisoesCard";
import type { ConfigPortas } from "./PortasCard";
import type { ConfigGaveta } from "./GavetasCard";
import { caixaInicial, frenteDeGaveta, idsIguais, novoIdGrupoPortas, placaInicial } from "./EditorItemNucleoHelpers";
import { ORDEM_SECOES, type ResultadoSalvarItem, type Secao } from "./EditorItemNucleoTipos";
import type { EditorItemNucleoEstado } from "./EditorItemNucleoEstado";
import type { SecaoPlaca } from "./secoes";

export function useEditorItemNucleoAcoes(
  estado: EditorItemNucleoEstado,
  onSalvar: (modulo: ModuloOrcamento) => Promise<ResultadoSalvarItem>
) {
  const {
    setBox,
    setPlaca,
    cores,
    categorias,
    ordemPlaca,
    modoSelecao,
    setModoSelecao,
    multiSelecaoVaos,
    setMultiSelecaoVaos,
    setVaosSelecionados,
    divisaoSelecionada,
    setDivisaoSelecionada,
    setPortaSelecionada,
    vaoGavetaSelecionado,
    setVaoGavetaSelecionado,
    setSecaoAbertaBox,
    setSecaoAbertaPlaca,
    vaosSelecionados,
    moduloAtual,
    setSalvando,
    setResultadoSalvar,
  } = estado;

  function setBoxCampo(patch: Partial<BoxModule>) {
    setBox((b) => ({ ...b, ...patch }));
  }

  function setPlacaCampo(patch: Partial<Placa>) {
    setPlaca((p) => ({ ...p, ...patch }));
  }

  function toggleLadoEngrossamento(lado: LadoPlaca) {
    setPlaca((p) => {
      if (p.engrossamento?.tecnica !== "engrossada") return p;
      const jaTem = p.engrossamento.lados.includes(lado);
      const lados = jaTem
        ? p.engrossamento.lados.filter((l) => l !== lado)
        : [...p.engrossamento.lados, lado];
      return { ...p, engrossamento: { ...p.engrossamento, lados } };
    });
  }

  function inverterSentidoVeio() {
    setPlaca((p) => ({
      ...p,
      sentidoVeio: (p.sentidoVeio ?? "comprimento") === "comprimento" ? "largura" : "comprimento",
    }));
  }

  function avancarSecao(atual: Secao) {
    const i = ORDEM_SECOES.indexOf(atual);
    setSecaoAbertaBox(ORDEM_SECOES[i + 1] ?? null);
  }

  function avancarSecaoPlaca(atual: SecaoPlaca) {
    const i = ordemPlaca.indexOf(atual);
    setSecaoAbertaPlaca(ordemPlaca[i + 1] ?? null);
  }

  function limparSelecoes() {
    setVaosSelecionados([]);
    setDivisaoSelecionada(null);
    setPortaSelecionada(null);
    setVaoGavetaSelecionado(null);
  }

  // Botão "Selecionar vãos": se ainda não é o modo atual, só troca de modo
  // (preserva o estado único/múltiplos que já estava). Se já é o modo atual,
  // alterna entre único e múltiplos (esse é o botão de 2 estados).
  function clicarSelecionarVaos() {
    if (modoSelecao !== "vaos") {
      setModoSelecao("vaos");
      setDivisaoSelecionada(null);
      setPortaSelecionada(null);
      setVaoGavetaSelecionado(null);
      return;
    }
    setMultiSelecaoVaos((v) => !v);
    setVaosSelecionados([]);
  }

  function clicarSelecionarDivisoes() {
    setModoSelecao("divisoes");
    setVaosSelecionados([]);
    setPortaSelecionada(null);
    setVaoGavetaSelecionado(null);
  }

  function clicarSelecionarPortas() {
    setModoSelecao("portas");
    setVaosSelecionados([]);
    setVaoGavetaSelecionado(null);
  }

  function clicarSelecionarGavetas() {
    setModoSelecao("gavetas");
    setVaosSelecionados([]);
    setPortaSelecionada(null);
  }

  function toggleVao(id: string) {
    if (!multiSelecaoVaos) {
      setVaosSelecionados([id]);
      return;
    }
    setVaosSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // Divisões: aplica em todos os vãos selecionados de uma vez.
  function aplicarDivisoes(cfg: ConfigDivisao) {
    setBox((b) => ({
      ...b,
      raiz: vaosSelecionados.reduce(
        (raiz, id) =>
          dividirVao(raiz, id, cfg.split, cfg.qtd, {
            recuoFrontal: cfg.recuoFrontal,
            posicao: cfg.posicao,
            recuoLateral: cfg.recuoLateral,
          }),
        b.raiz
      ),
    }));
    setVaosSelecionados([]);
  }

  function excluirDivisao() {
    if (!divisaoSelecionada) return;
    setBox((b) => ({
      ...b,
      raiz: excluirDivisoria(b.raiz, divisaoSelecionada.parentId, divisaoSelecionada.indice),
    }));
    setDivisaoSelecionada(null);
  }

  // Portas: entidade independente da árvore — só uma forma de inserir
  // (selecionar vão(s) e aplicar) e uma de editar/excluir (selecionar o
  // grupo existente no desenho).
  function aplicarPortasVaosSelecionados(cfg: ConfigPortas) {
    if (vaosSelecionados.length === 0) return;
    const grupo: GrupoPortas = {
      id: novoIdGrupoPortas(),
      alvo: { tipo: "vaos", vaoIds: [...vaosSelecionados] },
      tipoAbertura: cfg.tipoAbertura,
      sentido: cfg.sentido,
      qtd: cfg.qtd,
      material: { cor: cfg.cor, espessura: cfg.espessura },
    };
    setBox((b) => ({
      ...b,
      portas: [
        ...b.portas.filter((g) => !(g.alvo.tipo === "vaos" && idsIguais(g.alvo.vaoIds, vaosSelecionados))),
        grupo,
      ],
    }));
  }

  function excluirPortas() {
    setBox((b) => ({
      ...b,
      portas: b.portas.filter((g) => g.alvo.tipo !== "vaos" || !g.alvo.vaoIds.some((id) => vaosSelecionados.includes(id))),
    }));
  }

  function salvarEdicaoPorta(id: string, cfg: ConfigPortas) {
    setBox((b) => ({
      ...b,
      portas: b.portas.map((g) =>
        g.id === id
          ? { ...g, tipoAbertura: cfg.tipoAbertura, sentido: cfg.sentido, qtd: cfg.qtd, material: { cor: cfg.cor, espessura: cfg.espessura } }
          : g
      ),
    }));
    setPortaSelecionada(null);
  }

  function excluirGrupoPorta(id: string) {
    setBox((b) => ({ ...b, portas: b.portas.filter((g) => g.id !== id) }));
    setPortaSelecionada(null);
  }

  // Gavetas: continuam presas ao vão-folha (frente do BayContent). Criação
  // aplica a todos os vãos selecionados; edição/exclusão atua só no vão
  // selecionado no modo "Selecionar gaveta".
  function aplicarGavetas(cfg: ConfigGaveta) {
    setBox((b) => ({
      ...b,
      raiz: vaosSelecionados.reduce((raiz, id) => {
        const node = acharVao(raiz, id);
        if (!node || node.split !== "none") return raiz;
        const prateleiras = node.content?.tipo === "espaco" ? node.content.prateleiras : undefined;
        return definirConteudo(raiz, id, { tipo: "espaco", frente: frenteDeGaveta(cfg), prateleiras });
      }, b.raiz),
    }));
  }

  function excluirGavetas() {
    setBox((b) => ({
      ...b,
      raiz: vaosSelecionados.reduce((raiz, id) => {
        const node = acharVao(raiz, id);
        if (!node || node.split !== "none" || node.content?.tipo !== "espaco") return raiz;
        return definirConteudo(raiz, id, { tipo: "espaco", frente: { tipo: "vazio" }, prateleiras: node.content.prateleiras });
      }, b.raiz),
    }));
  }

  function salvarEdicaoGaveta(vaoId: string, cfg: ConfigGaveta) {
    setBox((b) => {
      const node = acharVao(b.raiz, vaoId);
      const prateleiras = node?.content?.tipo === "espaco" ? node.content.prateleiras : undefined;
      return { ...b, raiz: definirConteudo(b.raiz, vaoId, { tipo: "espaco", frente: frenteDeGaveta(cfg), prateleiras }) };
    });
    setVaoGavetaSelecionado(null);
  }

  function excluirEdicaoGaveta(vaoId: string) {
    setBox((b) => {
      const node = acharVao(b.raiz, vaoId);
      const prateleiras = node?.content?.tipo === "espaco" ? node.content.prateleiras : undefined;
      return { ...b, raiz: definirConteudo(b.raiz, vaoId, { tipo: "espaco", frente: { tipo: "vazio" }, prateleiras }) };
    });
    setVaoGavetaSelecionado(null);
  }

  // Reseta o módulo inteiro (caixa + divisões + portas + gavetas) pra
  // começar do zero — inclusive as medidas/material da Caixa. PRESERVA o
  // `id` atual (Task 13.3e: em `/orcamento/[id]/item/[itemId]` o `id` é a
  // chave que `salvarItemOrcamento` usa para achar a entrada em
  // `orcamento.itens` — perder o id aqui trocaria o item por um novo em vez
  // de reconfigurar o existente).
  function resetar() {
    if (!confirm("Isso apaga toda a configuração atual do módulo (Caixa, divisões, portas, gavetas) e recomeça do zero. Continuar?")) {
      return;
    }
    setBox((atual) => ({ ...caixaInicial(cores[0] ?? "Branco TX", categorias[0] ?? "Cozinha"), id: atual.id }));
    setSecaoAbertaBox("caixa");
    setModoSelecao("vaos");
    setMultiSelecaoVaos(false);
    limparSelecoes();
  }

  // Esvazia divisões/portas/gavetas, mas MANTÉM a configuração da Caixa
  // (nome, categoria, tipo, medidas, material, fundo, puxador).
  function limpar() {
    if (!confirm("Isso apaga todas as divisões, portas e gavetas, mantendo a configuração da Caixa. Continuar?")) {
      return;
    }
    setBox((b) => ({ ...b, raiz: vaoVazio("raiz"), portas: [] }));
    limparSelecoes();
  }

  // Reset da Placa — mesmo cuidado de preservar o `id` (ver `resetar` acima).
  function resetarPlaca() {
    if (!confirm("Isso apaga toda a configuração atual da placa e recomeça do zero. Continuar?")) {
      return;
    }
    setPlaca((atual) => ({ ...placaInicial(cores[0] ?? "Branco TX"), id: atual.id }));
    setSecaoAbertaPlaca(ordemPlaca[0] ?? null);
  }

  async function handleSalvar() {
    setSalvando(true);
    setResultadoSalvar(null);
    const resultado_ = await onSalvar(moduloAtual);
    setSalvando(false);
    setResultadoSalvar(resultado_);
  }

  return {
    setBoxCampo,
    setPlacaCampo,
    toggleLadoEngrossamento,
    inverterSentidoVeio,
    avancarSecao,
    avancarSecaoPlaca,
    clicarSelecionarVaos,
    clicarSelecionarDivisoes,
    clicarSelecionarPortas,
    clicarSelecionarGavetas,
    toggleVao,
    aplicarDivisoes,
    excluirDivisao,
    aplicarPortasVaosSelecionados,
    excluirPortas,
    salvarEdicaoPorta,
    excluirGrupoPorta,
    aplicarGavetas,
    excluirGavetas,
    salvarEdicaoGaveta,
    excluirEdicaoGaveta,
    resetar,
    limpar,
    resetarPlaca,
    handleSalvar,
  };
}
