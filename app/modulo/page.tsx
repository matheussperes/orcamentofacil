"use client";

import { useEffect, useMemo, useState } from "react";
import { BoxCanvas, type ModoSelecao } from "../components/BoxCanvas";
import {
  calcularOrcamentoBox,
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
import {
  carregarCatalogo,
  catalogoParaPrecos,
  coresDisponiveis,
  type Catalogo,
} from "@/lib/catalog";
import { montarLinhasInsumos } from "@/lib/insumos";
import { calcularPreco } from "@/lib/engine/pricing";
import { COMERCIAL_PADRAO, PARAMETROS_FABRICA_PADRAO } from "@/lib/engine/defaults";
import { atualizarPreset, buscarPreset, salvarPreset, seedPresetsPadrao } from "@/lib/boxPresets";
import { listarCategorias } from "@/lib/categorias";
import { planoDeCorte } from "@/lib/engine/box/cutting";
import { PlanoCorteCanvas } from "../components/PlanoCorteCanvas";
import { CaixaCard } from "./CaixaCard";
import { DivisoesCard, type ConfigDivisao } from "./DivisoesCard";
import { PortasCard, type ConfigPortas } from "./PortasCard";
import { GavetasCard, type ConfigGaveta, type GavetaEmEdicao } from "./GavetasCard";
import { PuxadorCard } from "./PuxadorCard";

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

export default function EditorModulo() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [box, setBox] = useState<BoxModule>(() => caixaInicial("Branco TX", "Cozinha"));
  // Quando o módulo foi reaberto a partir da Biblioteca (?preset=ID), salvar
  // atualiza o preset original em vez de criar um duplicado. Depois do
  // primeiro "Salvar este módulo" numa sessão nova, passa a rastrear
  // também — cliques seguintes atualizam, não duplicam.
  const [presetEditando, setPresetEditando] = useState<{ id: string } | null>(null);

  const [secaoAberta, setSecaoAberta] = useState<Secao | null>("caixa");
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
  }, []);

  const cores = useMemo(
    () => (catalogo ? coresDisponiveis(catalogo) : ["Branco TX", "Louro Freijó"]),
    [catalogo]
  );

  // Custo ao vivo (reaproveita todo o pipeline).
  const resultado = useMemo(() => {
    const precos = catalogo ? catalogoParaPrecos(catalogo) : undefined;
    const engine = calcularOrcamentoBox([box], PARAMETROS_FABRICA_PADRAO.perda_mdf);
    const financeiro = calcularPreco(engine, COMERCIAL_PADRAO, precos);
    const insumos = precos
      ? montarLinhasInsumos(engine, precos, { incluirServicos: true })
      : null;
    return { engine, financeiro, insumos };
  }, [box, catalogo]);

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

  function avancarSecao(atual: Secao) {
    const i = ORDEM_SECOES.indexOf(atual);
    setSecaoAberta(ORDEM_SECOES[i + 1] ?? null);
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
    setSecaoAberta("caixa");
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
        <h1>Editor de módulo (caixa + subdivisões)</h1>
        <p>
          Monte a caixa vazia, divida em vãos e aplique portas/gavetas nos vãos selecionados.{" "}
          <a href="/">← calculadora</a> · <a href="/biblioteca">Biblioteca de módulos</a> ·{" "}
          <a href="/configuracoes/materiais">Materiais</a>
        </p>
        {presetEditando && (
          <p className="muted" style={{ fontSize: 12, marginTop: -12 }}>
            Editando um módulo já cadastrado — &quot;Salvar este módulo&quot; atualiza esse preset (não cria um novo).
          </p>
        )}
      </header>

      <div className="grid">
        {/* Esquerda: configuração da caixa + divisões + conteúdo */}
        <div>
          <CaixaCard
            box={box}
            cores={cores}
            categorias={categorias}
            onChange={setBoxCampo}
            aberta={secaoAberta === "caixa"}
            onAbrir={() => setSecaoAberta("caixa")}
            onSalvar={() => avancarSecao("caixa")}
          />

          <DivisoesCard
            vaosSelecionados={vaosSelecionados}
            divisaoSelecionada={divisaoSelecionada}
            modoSelecaoDivisoes={modoSelecao === "divisoes"}
            onSelecionarModoDivisoes={clicarSelecionarDivisoes}
            onAplicar={aplicarDivisoes}
            onExcluir={excluirDivisao}
            aberta={secaoAberta === "divisoes"}
            onAbrir={() => setSecaoAberta("divisoes")}
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
            aberta={secaoAberta === "portas"}
            onAbrir={() => setSecaoAberta("portas")}
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
            aberta={secaoAberta === "gavetas"}
            onAbrir={() => setSecaoAberta("gavetas")}
            onSalvar={() => avancarSecao("gavetas")}
          />

          <PuxadorCard
            tipo={box.puxador}
            onChange={(tipo) => setBoxCampo({ puxador: tipo })}
            aberta={secaoAberta === "puxador"}
            onAbrir={() => setSecaoAberta("puxador")}
            onSalvar={() => avancarSecao("puxador")}
          />

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

        {/* Direita: canvas de seleção + custo + peças */}
        <div>
          <div className="card">
            <h2>Vãos (clique para selecionar)</h2>
            <div className="acoes" style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button
                className={modoSelecao === "vaos" ? "primary" : "ghost"}
                onClick={clicarSelecionarVaos}
              >
                Selecionar vãos{modoSelecao === "vaos" && multiSelecaoVaos ? " (múltiplos)" : ""}
              </button>
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
          </div>

          <div className="card">
            <h2>Custo ao vivo</h2>
            <div className="kpis">
              <div className="kpi destaque">
                <div className="rot">Preço final</div>
                <div className="val">{brl(resultado.financeiro.precoComDesconto)}</div>
              </div>
              <div className="kpi">
                <div className="rot">Custo direto</div>
                <div className="val">{brl(resultado.financeiro.custoDireto)}</div>
              </div>
            </div>
            {resultado.insumos && (
              <table style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qtd</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.insumos.linhas.map((l, i) => (
                    <tr key={i}>
                      <td>{l.item}</td>
                      <td>{l.qtd}</td>
                      <td className="num">{brl(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h2>Peças (lista técnica)</h2>
            <table>
              <thead>
                <tr>
                  <th>Peça</th>
                  <th>Material</th>
                  <th className="num">Qtd</th>
                  <th className="num">Dimensões (mm)</th>
                </tr>
              </thead>
              <tbody>
                {pecas.map((p, i) => (
                  <tr key={i}>
                    <td>{p.nome}</td>
                    <td>{p.cor} {p.espessura_mm}mm</td>
                    <td className="num">{p.quantidade}</td>
                    <td className="num">{p.largura_mm}×{p.altura_mm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
