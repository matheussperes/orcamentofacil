"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { BoxCanvas, type ModoSelecao } from "../components/BoxCanvas";
import { PlacaVisual } from "../components/PlacaVisual";
import { calcularOrcamentoMisto, type ModuloOrcamento } from "@/lib/orcamento";
import {
  vaoVazio,
  type BoxModule,
  type FrenteConteudo,
  type GrupoPortas,
} from "@/lib/engine/box";
import {
  acharVao,
  definirConteudo,
  dividirVao,
  excluirDivisoria,
} from "@/lib/engine/box/tree";
import type { LadoPlaca, Placa } from "@/lib/engine/placa/types";
import {
  carregarCatalogo,
  catalogoParaPrecos,
  coresDisponiveis,
  type Catalogo,
} from "@/lib/catalog";
import { montarLinhasInsumos } from "@/lib/insumos";
import { calcularPreco } from "@/lib/engine/pricing";
import {
  COMERCIAL_PADRAO,
  MATERIAIS_PADRAO,
  PARAMETROS_FABRICA_PADRAO,
} from "@/lib/engine/defaults";
import { atualizarPreset, buscarPreset, salvarPreset, seedPresetsPadrao } from "@/lib/boxPresets";
import { listarCategorias } from "@/lib/categorias";
import { planoDeCorte } from "@/lib/engine/box/cutting";
import { PlanoCorteCanvas } from "../components/PlanoCorteCanvas";
import { Stepper } from "@/components/ui/stepper";
import { CaixaCard } from "./CaixaCard";
import { DivisoesCard, type ConfigDivisao } from "./DivisoesCard";
import { PortasCard, type ConfigPortas } from "./PortasCard";
import { GavetasCard, type ConfigGaveta, type GavetaEmEdicao } from "./GavetasCard";
import { PuxadorCard } from "./PuxadorCard";
import { PlacaDimensoesCard } from "./PlacaDimensoesCard";
import { PlacaOrientacaoCard } from "./PlacaOrientacaoCard";
import { PlacaBordaCard } from "./PlacaBordaCard";
import { PlacaEngrossamentoCard } from "./PlacaEngrossamentoCard";
import { PlacaRipadoCard } from "./PlacaRipadoCard";
import { ordemSecoesPlaca, ROTULOS_SECOES_PLACA, type SecaoPlaca } from "./secoes";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function caixaInicial(cor: string, categoria: string): BoxModule {
  return {
    id: "box-1",
    nome: "Módulo novo",
    tipo: "inferior",
    categoria,
    largura: 800,
    altura: 720,
    profundidade: 550,
    caixa: { cor, espessura: 15 },
    raiz: vaoVazio("raiz"),
    portas: [],
    temFundo: true,
    puxador: "haste",
  };
}

// Task 13.1 — estado inicial de Placa, mesmo espírito de `caixaInicial`
// (id fixo "placa-1": o editor edita UM item por vez, igual ao box).
function placaInicial(cor: string): Placa {
  return {
    id: "placa-1",
    nome: "Placa nova",
    largura: 600,
    altura: 400,
    material: { cor, espessura: 15 },
    orientacao: "horizontal",
  };
}

function novoIdGrupoPortas(): string {
  return "porta-" + Math.random().toString(36).slice(2, 9);
}

function idsIguais(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

interface DivisaoSel {
  parentId: string;
  indice: number;
}

type Secao = "caixa" | "divisoes" | "portas" | "gavetas" | "puxador";
const ORDEM_SECOES: Secao[] = ["caixa", "divisoes", "portas", "gavetas", "puxador"];
// Task 7.1 — rótulos do Stepper (Design-System Seção 6.5), na mesma ordem de
// ORDEM_SECOES. Mesmo texto usado no `titulo` de cada SecaoHeader.
const ROTULOS_SECOES: Record<Secao, string> = {
  caixa: "Caixa",
  divisoes: "Divisões",
  portas: "Portas",
  gavetas: "Gavetas",
  puxador: "Puxador",
};

export default function EditorModulo() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [box, setBox] = useState<BoxModule>(() => caixaInicial("Branco TX", "Cozinha"));
  const [placa, setPlaca] = useState<Placa>(() => placaInicial("Branco TX"));
  // Task 13.1 — Editor de Item dirigido por capacidade: qual `ModuloOrcamento`
  // está sendo editado agora. `box`/`placa` continuam em estados separados
  // (troca de aba preserva o progresso dos dois lados) — `moduloAtual`
  // (abaixo) é a projeção que o resto do pipeline (custo/peças/plano de
  // corte) consome, uniformemente, via `calcularOrcamentoMisto`.
  const [origemAtual, setOrigemAtual] = useState<ModuloOrcamento["origem"]>("custom_box");
  // Quando o módulo foi reaberto a partir da Biblioteca (?preset=ID), salvar
  // atualiza o preset original em vez de criar um duplicado. Depois do
  // primeiro "Salvar este módulo" numa sessão nova, passa a rastrear
  // também — cliques seguintes atualizam, não duplicam. Presets hoje só
  // existem para módulo-caixa (`lib/boxPresets.ts` é tipado a `BoxModule`) —
  // Placa não tem biblioteca de presets nesta task (fica para uma task
  // futura de dados, não é decisão de UI).
  const [presetEditando, setPresetEditando] = useState<{ id: string } | null>(null);

  const [secaoAbertaBox, setSecaoAbertaBox] = useState<Secao | null>("caixa");
  const ordemPlaca = useMemo(() => ordemSecoesPlaca("placa"), []);
  const [secaoAbertaPlaca, setSecaoAbertaPlaca] = useState<SecaoPlaca | null>(ordemPlaca[0] ?? null);
  const [modoSelecao, setModoSelecao] = useState<ModoSelecao>("vaos");
  // Desativado (padrão): clicar num vão troca a seleção (só 1 por vez).
  // Ativado: clicar soma/remove vãos da seleção (usado pra aplicar portas em
  // vários vãos de uma vez).
  const [multiSelecaoVaos, setMultiSelecaoVaos] = useState(false);
  const [vaosSelecionados, setVaosSelecionados] = useState<string[]>([]);
  const [divisaoSelecionada, setDivisaoSelecionada] = useState<DivisaoSel | null>(null);
  const [portaSelecionada, setPortaSelecionada] = useState<string | null>(null);
  const [vaoGavetaSelecionado, setVaoGavetaSelecionado] = useState<string | null>(null);

  useEffect(() => {
    const cat = carregarCatalogo();
    setCatalogo(cat);
    seedPresetsPadrao();
    const cats = listarCategorias();
    setCategorias(cats);

    const params = new URLSearchParams(window.location.search);
    const presetId = params.get("preset");
    const preset = presetId ? buscarPreset(presetId) : undefined;
    if (preset) {
      setBox(preset.box);
      setPresetEditando({ id: preset.id });
      return;
    }

    const branco = coresDisponiveis(cat).find((c) => c.toLowerCase().includes("branco"));
    setBox((b) => ({
      ...b,
      caixa: { ...b.caixa, cor: branco ?? b.caixa.cor },
      categoria: cats[0] ?? b.categoria,
    }));
    setPlaca((p) => ({ ...p, material: { ...p.material, cor: branco ?? p.material.cor } }));
  }, []);

  const cores = useMemo(
    () => (catalogo ? coresDisponiveis(catalogo) : ["Branco TX", "Louro Freijó"]),
    [catalogo]
  );

  // Task 13.1 — item unificado sendo editado agora (union `ModuloOrcamento`,
  // Modelo de Domínio Seção 1). Alimenta `calcularOrcamentoMisto`, que já
  // sabe explodir tanto `custom_box` quanto `placa` (Task 12.7) — o painel
  // direito (custo/peças/plano de corte) passa a funcionar para os dois
  // tipos sem nenhum branch de origem lá.
  const moduloAtual: ModuloOrcamento = useMemo(
    () => (origemAtual === "custom_box" ? { origem: "custom_box", box } : { origem: "placa", placa }),
    [origemAtual, box, placa]
  );

  // Custo ao vivo (reaproveita todo o pipeline, agora via calcularOrcamentoMisto).
  const resultado = useMemo(() => {
    const precos = catalogo ? catalogoParaPrecos(catalogo) : undefined;
    const engine = calcularOrcamentoMisto({
      ambiente: { tipo: box.categoria ?? "Geral", materiais: MATERIAIS_PADRAO },
      parametros: PARAMETROS_FABRICA_PADRAO,
      itens: [moduloAtual],
    });
    const financeiro = calcularPreco(engine, COMERCIAL_PADRAO, precos);
    const insumos = precos
      ? montarLinhasInsumos(engine, precos, { incluirServicos: true })
      : null;
    return { engine, financeiro, insumos };
  }, [moduloAtual, catalogo, box.categoria]);

  // Task 7.1 — Stepper (Seção 6.5) é só leitura de `secaoAbertaBox`/
  // ORDEM_SECOES, nenhum estado novo. Quando `secaoAbertaBox` é null
  // (Puxador acabou de ser salvo, nenhuma seção aberta), mantém a última
  // etapa em destaque. Mesmo padrão replicado para Placa com `ordemPlaca`
  // (Task 13.1), derivada do schema `CAPACIDADES` (ver `./secoes.ts`).
  const stepperIndexBox = secaoAbertaBox
    ? ORDEM_SECOES.indexOf(secaoAbertaBox)
    : ORDEM_SECOES.length - 1;
  const stepperIndexPlaca = secaoAbertaPlaca
    ? ordemPlaca.indexOf(secaoAbertaPlaca)
    : ordemPlaca.length - 1;

  const pecas = useMemo(() => resultado.engine.porModulo[0]?.pecas ?? [], [resultado]);
  const grupos = useMemo(() => planoDeCorte(pecas), [pecas]);

  // Grupo de porta / vão com gaveta atualmente selecionado no canvas, pra
  // carregar no formulário de edição (ver PortasCard/GavetasCard).
  const grupoPortaEmEdicao: GrupoPortas | null = useMemo(
    () => (portaSelecionada ? box.portas.find((g) => g.id === portaSelecionada) ?? null : null),
    [portaSelecionada, box.portas]
  );
  const gavetaEmEdicao: GavetaEmEdicao | null = useMemo(() => {
    if (!vaoGavetaSelecionado) return null;
    const node = acharVao(box.raiz, vaoGavetaSelecionado);
    if (!node || node.split !== "none" || node.content?.tipo !== "espaco" || node.content.frente.tipo !== "gaveta") {
      return null;
    }
    const f = node.content.frente;
    return {
      vaoId: vaoGavetaSelecionado,
      config: {
        interna: f.interna,
        qtd: f.qtd,
        profundidade: f.profundidade,
        cor: f.interna ? cores[0] ?? "Branco TX" : f.corFrente ?? cores[0] ?? "Branco TX",
        espessura: f.interna ? 18 : f.espessuraFrente ?? 18,
      },
    };
  }, [vaoGavetaSelecionado, box.raiz, cores]);

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

  function limparSelecoes() {
    setVaosSelecionados([]);
    setDivisaoSelecionada(null);
    setPortaSelecionada(null);
    setVaoGavetaSelecionado(null);
  }

  // Reseta o módulo inteiro (caixa + divisões + portas + gavetas) pra
  // começar do zero — inclusive as medidas/material da Caixa.
  function resetar() {
    if (!confirm("Isso apaga toda a configuração atual do módulo (Caixa, divisões, portas, gavetas) e recomeça do zero. Continuar?")) {
      return;
    }
    setBox(caixaInicial(cores[0] ?? "Branco TX", categorias[0] ?? "Cozinha"));
    setPresetEditando(null);
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

  // Task 13.1 — reset da Placa (sem preset/biblioteca envolvidos, ao
  // contrário do box: Placa não tem persistência ainda).
  function resetarPlaca() {
    if (!confirm("Isso apaga toda a configuração atual da placa e recomeça do zero. Continuar?")) {
      return;
    }
    setPlaca(placaInicial(cores[0] ?? "Branco TX"));
    setSecaoAbertaPlaca(ordemPlaca[0] ?? null);
  }

  function salvar() {
    if (presetEditando) {
      atualizarPreset(presetEditando.id, { nome: box.nome || "Módulo", categoria: box.categoria || "Cozinha", box });
      alert(`Preset "${box.nome || "Módulo"}" atualizado.`);
      return;
    }
    const p = salvarPreset(box.nome || "Módulo", box.categoria || "Cozinha", box);
    setPresetEditando({ id: p.id });
    alert(
      `Preset "${p.nome}" salvo em "${p.categoria}". Disponível no orçamento em Ambiente → Tipo → Modelo.`
    );
  }

  return (
    <div className="wrap">
      <header className="top">
        <h1>Editor de item (módulo-caixa + placa)</h1>
        <p>
          Monte a caixa vazia, divida em vãos e aplique portas/gavetas nos vãos selecionados — ou
          configure uma placa avulsa (prateleira, fechamento, painel).{" "}
          <a href="/">← calculadora</a> · <a href="/biblioteca">Biblioteca de módulos</a> ·{" "}
          <a href="/configuracoes/materiais">Materiais</a>
        </p>
        {presetEditando && origemAtual === "custom_box" && (
          <p className="muted" style={{ fontSize: 12, marginTop: -12 }}>
            Editando um módulo já cadastrado — &quot;Salvar este módulo&quot; atualiza esse preset (não cria um novo).
          </p>
        )}
        {/* Task 13.1 — seletor de tipo de item: troca qual `ModuloOrcamento`
            (custom_box × placa) está sendo editado. Único ponto do arquivo
            que decide "qual editor mostrar" — dentro de cada lado, a lista
            de seções vem do schema `CAPACIDADES` (ver ./secoes.ts), não de
            condicionais soltos por seção. */}
        <div className="flex flex-wrap gap-sm" style={{ marginTop: 4 }}>
          <Button
            variant={origemAtual === "custom_box" ? "iconActive" : "ghost"}
            size="sm"
            onClick={() => setOrigemAtual("custom_box")}
          >
            Módulo-caixa
          </Button>
          <Button
            variant={origemAtual === "placa" ? "iconActive" : "ghost"}
            size="sm"
            onClick={() => setOrigemAtual("placa")}
          >
            Placa
          </Button>
        </div>
      </header>

      <div className="grid">
        {/* Esquerda: configuração da caixa + divisões + conteúdo, OU as
            seções de Placa — nunca as duas ao mesmo tempo. */}
        <div>
          {origemAtual === "custom_box" ? (
            <>
              {/* Task 7.1 — Stepper (Seção 6.5) acima da pilha do accordion,
                  refletindo secaoAbertaBox/ORDEM_SECOES (só leitura, sem novo estado). */}
              <Stepper
                steps={ORDEM_SECOES.map((s) => ROTULOS_SECOES[s])}
                currentStep={stepperIndexBox}
                className="mb-4"
              />

              {/* Os 5 cards do accordion usam gap-sm (8px) entre si — reforça que
                  são etapas de um fluxo, distinto do gap-lg de cards independentes
                  (ver "Plano de corte" abaixo, fora do accordion). */}
              <div className="mb-4 flex flex-col gap-2">
                <CaixaCard
                  box={box}
                  cores={cores}
                  categorias={categorias}
                  onChange={setBoxCampo}
                  aberta={secaoAbertaBox === "caixa"}
                  onAbrir={() => setSecaoAbertaBox("caixa")}
                  onSalvar={() => avancarSecao("caixa")}
                />

                <DivisoesCard
                  vaosSelecionados={vaosSelecionados}
                  divisaoSelecionada={divisaoSelecionada}
                  modoSelecaoDivisoes={modoSelecao === "divisoes"}
                  onSelecionarModoDivisoes={clicarSelecionarDivisoes}
                  onAplicar={aplicarDivisoes}
                  onExcluir={excluirDivisao}
                  aberta={secaoAbertaBox === "divisoes"}
                  onAbrir={() => setSecaoAbertaBox("divisoes")}
                  onSalvar={() => avancarSecao("divisoes")}
                />

                <PortasCard
                  vaosSelecionados={vaosSelecionados}
                  cores={cores}
                  catalogo={catalogo}
                  modoSelecaoPortas={modoSelecao === "portas"}
                  onSelecionarModoPortas={clicarSelecionarPortas}
                  grupoEmEdicao={grupoPortaEmEdicao}
                  onAplicarVaosSelecionados={aplicarPortasVaosSelecionados}
                  onSalvarEdicao={salvarEdicaoPorta}
                  onExcluirGrupo={excluirGrupoPorta}
                  onCancelarEdicao={() => setPortaSelecionada(null)}
                  onExcluirPorVaos={excluirPortas}
                  aberta={secaoAbertaBox === "portas"}
                  onAbrir={() => setSecaoAbertaBox("portas")}
                  onSalvar={() => avancarSecao("portas")}
                />

                <GavetasCard
                  vaosSelecionados={vaosSelecionados}
                  cores={cores}
                  catalogo={catalogo}
                  modoSelecaoGavetas={modoSelecao === "gavetas"}
                  onSelecionarModoGavetas={clicarSelecionarGavetas}
                  gavetaEmEdicao={gavetaEmEdicao}
                  onAplicar={aplicarGavetas}
                  onSalvarEdicao={salvarEdicaoGaveta}
                  onExcluirEdicao={excluirEdicaoGaveta}
                  onCancelarEdicao={() => setVaoGavetaSelecionado(null)}
                  onExcluir={excluirGavetas}
                  aberta={secaoAbertaBox === "gavetas"}
                  onAbrir={() => setSecaoAbertaBox("gavetas")}
                  onSalvar={() => avancarSecao("gavetas")}
                />

                <PuxadorCard
                  tipo={box.puxador}
                  onChange={(tipo) => setBoxCampo({ puxador: tipo })}
                  aberta={secaoAbertaBox === "puxador"}
                  onAbrir={() => setSecaoAbertaBox("puxador")}
                  onSalvar={() => avancarSecao("puxador")}
                />
              </div>
            </>
          ) : (
            <>
              {/* Task 13.1 — mesmo padrão de Stepper do box, agora sobre
                  `ordemPlaca` (derivada de CAPACIDADES.placa). */}
              <Stepper
                steps={ordemPlaca.map((s) => ROTULOS_SECOES_PLACA[s])}
                currentStep={stepperIndexPlaca}
                className="mb-4"
              />

              <div className="mb-4 flex flex-col gap-2">
                {ordemPlaca.includes("dimensoesMaterial") && (
                  <PlacaDimensoesCard
                    placa={placa}
                    cores={cores}
                    catalogo={catalogo}
                    onChange={setPlacaCampo}
                    aberta={secaoAbertaPlaca === "dimensoesMaterial"}
                    onAbrir={() => setSecaoAbertaPlaca("dimensoesMaterial")}
                    onSalvar={() => avancarSecaoPlaca("dimensoesMaterial")}
                  />
                )}
                {ordemPlaca.includes("orientacao") && (
                  <PlacaOrientacaoCard
                    orientacao={placa.orientacao}
                    onChange={(orientacao) => setPlacaCampo({ orientacao })}
                    aberta={secaoAbertaPlaca === "orientacao"}
                    onAbrir={() => setSecaoAbertaPlaca("orientacao")}
                    onSalvar={() => avancarSecaoPlaca("orientacao")}
                  />
                )}
                {ordemPlaca.includes("bordaPorLado") && (
                  <PlacaBordaCard
                    bordaPorLado={placa.bordaPorLado}
                    onChange={(bordaPorLado) => setPlacaCampo({ bordaPorLado })}
                    aberta={secaoAbertaPlaca === "bordaPorLado"}
                    onAbrir={() => setSecaoAbertaPlaca("bordaPorLado")}
                    onSalvar={() => avancarSecaoPlaca("bordaPorLado")}
                  />
                )}
                {ordemPlaca.includes("engrossamento") && (
                  <PlacaEngrossamentoCard
                    engrossamento={placa.engrossamento}
                    espessuraBase={placa.material.espessura}
                    onChange={(engrossamento) => setPlacaCampo({ engrossamento })}
                    aberta={secaoAbertaPlaca === "engrossamento"}
                    onAbrir={() => setSecaoAbertaPlaca("engrossamento")}
                    onSalvar={() => avancarSecaoPlaca("engrossamento")}
                  />
                )}
                {ordemPlaca.includes("ripado") && (
                  <PlacaRipadoCard
                    ripado={placa.ripado}
                    onChange={(ripado) => setPlacaCampo({ ripado })}
                    aberta={secaoAbertaPlaca === "ripado"}
                    onAbrir={() => setSecaoAbertaPlaca("ripado")}
                    onSalvar={() => avancarSecaoPlaca("ripado")}
                  />
                )}
              </div>
            </>
          )}

          <div className="card">
            <h2>Plano de corte</h2>
            <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
              Chapas de {grupos[0]?.larguraChapa ?? 2750}×{grupos[0]?.alturaChapa ?? 1840}mm,
              escala 1:10. Empacotamento heurístico (prateleiras) — apenas para validação
              visual, não substitui um otimizador de corte industrial.
            </p>
            {grupos.length === 0 && <p className="muted">Nenhuma peça gerada ainda.</p>}
            {grupos.map((g) => (
              <div key={`${g.cor}-${g.espessura_mm}`} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>
                  MDF {g.cor} {g.espessura_mm}mm — {g.chapas.length} chapa(s)
                </div>
                <div>
                  {g.chapas.map((c) => (
                    <PlanoCorteCanvas
                      key={c.index}
                      chapa={c}
                      larguraChapa={g.larguraChapa}
                      alturaChapa={g.alturaChapa}
                    />
                  ))}
                </div>
                {g.pecasForaDaChapa.length > 0 && (
                  <div className="aviso erro">
                    {g.pecasForaDaChapa.length} peça(s) maior(es) que a chapa em
                    qualquer orientação: {g.pecasForaDaChapa.map((p) => p.nome).join(", ")}.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Direita: canvas de seleção (box) ou referência visual (placa) +
            custo + peças. Tokens de KPI/tabela — Design-System Seção 6.8/6.9,
            mesmos já em produção desde as Tasks 6.5/7.2 (ver app/page.tsx) —
            absorvendo a Task 7.3 (nunca executada isoladamente). */}
        <div>
          <div className="card">
            {origemAtual === "custom_box" ? (
              <>
                <h2>Vãos (clique para selecionar)</h2>
                <div className="flex flex-wrap gap-sm mb-sm">
                  <Button
                    variant={modoSelecao === "vaos" ? "iconActive" : "ghost"}
                    size="sm"
                    onClick={clicarSelecionarVaos}
                  >
                    Selecionar vãos{modoSelecao === "vaos" && multiSelecaoVaos ? " (múltiplos)" : ""}
                  </Button>
                </div>
                <BoxCanvas
                  box={box}
                  modoSelecao={modoSelecao}
                  vaosSelecionados={vaosSelecionados}
                  onToggleVao={toggleVao}
                  divisaoSelecionada={divisaoSelecionada}
                  onSelecionarDivisoria={setDivisaoSelecionada}
                  portaSelecionada={portaSelecionada}
                  onSelecionarPorta={setPortaSelecionada}
                  vaoGavetaSelecionado={vaoGavetaSelecionado}
                  onSelecionarVaoGaveta={setVaoGavetaSelecionado}
                />
                <div className="acoes" style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button className="primary" onClick={salvar}>Salvar este módulo</button>
                  <button className="ghost" onClick={limpar}>Limpar</button>
                  <button className="danger" onClick={resetar}>Resetar</button>
                </div>
              </>
            ) : (
              <>
                <h2>Placa (referência visual)</h2>
                <PlacaVisual
                  largura={placa.largura}
                  altura={placa.altura}
                  lados={placa.engrossamento?.tecnica === "engrossada" ? placa.engrossamento.lados : []}
                  ladosInterativos={placa.engrossamento?.tecnica === "engrossada"}
                  onToggleLado={toggleLadoEngrossamento}
                  temVeio={placa.material.temVeio ?? false}
                  sentidoVeio={placa.sentidoVeio ?? "comprimento"}
                  onInverterVeio={inverterSentidoVeio}
                />
                <div className="acoes" style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button className="danger" onClick={resetarPlaca}>Resetar</button>
                </div>
              </>
            )}
          </div>

          <div className="card">
            <h2>Custo ao vivo</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-accent-border bg-accent-subtle p-3">
                <div className="text-legenda text-cinza-500">Preço final</div>
                <div className="text-valor-destaque text-accent tabular-nums">
                  {brl(resultado.financeiro.precoComDesconto)}
                </div>
              </div>
              <div className="rounded-lg border border-cinza-200 bg-cinza-0 p-3">
                <div className="text-legenda text-cinza-500">Custo direto</div>
                <div className="text-valor-destaque text-cinza-900 tabular-nums">
                  {brl(resultado.financeiro.custoDireto)}
                </div>
              </div>
            </div>
            {resultado.insumos && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-cinza-200 bg-cinza-50">
                      <th className="px-[10px] py-2 text-left text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                        Item
                      </th>
                      <th className="px-[10px] py-2 text-left text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                        Qtd
                      </th>
                      <th className="px-[10px] py-2 text-right text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.insumos.linhas.map((l, i) => (
                      <tr key={i} className="border-b border-cinza-100 hover:bg-cinza-50">
                        <td className="px-[10px] py-2 text-corpo-pequeno">{l.item}</td>
                        <td className="px-[10px] py-2 text-corpo-pequeno">{l.qtd}</td>
                        <td className="px-[10px] py-2 text-right text-corpo-pequeno tabular-nums">
                          {brl(l.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Peças (lista técnica)</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-cinza-200 bg-cinza-50">
                    <th className="px-[10px] py-2 text-left text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                      Peça
                    </th>
                    <th className="px-[10px] py-2 text-left text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                      Material
                    </th>
                    <th className="px-[10px] py-2 text-right text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                      Qtd
                    </th>
                    <th className="px-[10px] py-2 text-right text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                      Dimensões (mm)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pecas.map((p, i) => (
                    <tr key={i} className="border-b border-cinza-100 hover:bg-cinza-50">
                      <td className="px-[10px] py-2 text-corpo-pequeno">{p.nome}</td>
                      <td className="px-[10px] py-2 text-corpo-pequeno text-cinza-500">
                        {p.cor} {p.espessura_mm}mm
                      </td>
                      <td className="px-[10px] py-2 text-right text-corpo-pequeno tabular-nums">
                        {p.quantidade}
                      </td>
                      <td className="px-[10px] py-2 text-right text-corpo-pequeno tabular-nums">
                        {p.largura_mm}×{p.altura_mm}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function frenteDeGaveta(cfg: ConfigGaveta): FrenteConteudo {
  return cfg.interna
    ? { tipo: "gaveta", qtd: cfg.qtd, profundidade: cfg.profundidade, interna: true }
    : {
        tipo: "gaveta",
        qtd: cfg.qtd,
        profundidade: cfg.profundidade,
        interna: false,
        corFrente: cfg.cor,
        espessuraFrente: cfg.espessura,
      };
}
