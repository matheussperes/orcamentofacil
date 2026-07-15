"use client";

import { useEffect, useMemo, useState } from "react";
import { BoxCanvas } from "../components/BoxCanvas";
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
  limparVao,
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
import { salvarPreset, seedPresetsPadrao } from "@/lib/boxPresets";
import { listarCategorias } from "@/lib/categorias";
import { planoDeCorte } from "@/lib/engine/box/cutting";
import { PlanoCorteCanvas } from "../components/PlanoCorteCanvas";
import { CaixaCard } from "./CaixaCard";
import { DivisoesCard, type ConfigDivisao } from "./DivisoesCard";
import { PortasCard, type ConfigPortas } from "./PortasCard";
import { GavetasCard, type ConfigGaveta } from "./GavetasCard";
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

export default function EditorModulo() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [box, setBox] = useState<BoxModule>(() => caixaInicial("Branco TX", "Cozinha"));

  const [modoSelecao, setModoSelecao] = useState<"vaos" | "divisoes">("vaos");
  const [vaosSelecionados, setVaosSelecionados] = useState<string[]>([]);
  const [divisaoSelecionada, setDivisaoSelecionada] = useState<DivisaoSel | null>(null);

  useEffect(() => {
    const cat = carregarCatalogo();
    setCatalogo(cat);
    seedPresetsPadrao();
    const cats = listarCategorias();
    setCategorias(cats);
    const branco = coresDisponiveis(cat).find((c) => c.toLowerCase().includes("branco"));
    setBox((b) => ({
      ...b,
      caixa: { ...b.caixa, cor: branco ?? b.caixa.cor },
      categoria: cats[0] ?? b.categoria,
    }));
  }, []);

  const cores = catalogo ? coresDisponiveis(catalogo) : ["Branco TX", "Louro Freijó"];

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

  const pecas = resultado.engine.porModulo[0]?.pecas ?? [];
  const grupos = useMemo(() => planoDeCorte(pecas), [pecas]);

  function setBoxCampo(patch: Partial<BoxModule>) {
    setBox((b) => ({ ...b, ...patch }));
  }

  function trocarModoSelecao(m: "vaos" | "divisoes") {
    setModoSelecao(m);
    if (m === "vaos") setDivisaoSelecionada(null);
    else setVaosSelecionados([]);
  }

  function toggleVao(id: string) {
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

  // Portas: entidade independente da árvore — cobre a caixa inteira ou os
  // vãos selecionados no momento do clique.
  function aplicarPortasCaixaInteira(cfg: ConfigPortas) {
    const grupo: GrupoPortas = {
      id: novoIdGrupoPortas(),
      alvo: { tipo: "caixa_inteira" },
      tipoAbertura: cfg.tipoAbertura,
      sentido: cfg.sentido,
      qtd: cfg.qtd,
      material: { cor: cfg.cor, espessura: cfg.espessura },
    };
    setBox((b) => ({ ...b, portas: [...b.portas.filter((g) => g.alvo.tipo !== "caixa_inteira"), grupo] }));
  }

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
      portas: b.portas.filter((g) => {
        if (vaosSelecionados.length === 0) return g.alvo.tipo !== "caixa_inteira";
        if (g.alvo.tipo === "caixa_inteira") return true;
        return !g.alvo.vaoIds.some((id) => vaosSelecionados.includes(id));
      }),
    }));
  }

  // Gavetas: continuam presas ao vão-folha (frente do BayContent), aplicadas
  // a todos os vãos selecionados, preservando prateleiras existentes.
  function aplicarGavetas(cfg: ConfigGaveta) {
    setBox((b) => ({
      ...b,
      raiz: vaosSelecionados.reduce((raiz, id) => {
        const node = acharVao(raiz, id);
        if (!node || node.split !== "none") return raiz;
        const prateleiras = node.content?.tipo === "espaco" ? node.content.prateleiras : undefined;
        const frente: FrenteConteudo = cfg.interna
          ? { tipo: "gaveta", qtd: cfg.qtd, profundidade: cfg.profundidade, interna: true }
          : {
              tipo: "gaveta",
              qtd: cfg.qtd,
              profundidade: cfg.profundidade,
              interna: false,
              corFrente: cfg.cor,
              espessuraFrente: cfg.espessura,
            };
        return definirConteudo(raiz, id, { tipo: "espaco", frente, prateleiras });
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

  function esvaziarVao() {
    setBox((b) => ({ ...b, raiz: vaosSelecionados.reduce((raiz, id) => limparVao(raiz, id), b.raiz) }));
    setVaosSelecionados([]);
  }

  function salvar() {
    const p = salvarPreset(box.nome || "Módulo", box.categoria || "Cozinha", box);
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
          <a href="/">← calculadora</a> · <a href="/configuracoes/materiais">Materiais</a>
        </p>
      </header>

      <div className="grid">
        {/* Esquerda: configuração da caixa + divisões + conteúdo */}
        <div>
          <CaixaCard box={box} cores={cores} categorias={categorias} onChange={setBoxCampo} />

          <DivisoesCard
            vaosSelecionados={vaosSelecionados}
            divisaoSelecionada={divisaoSelecionada}
            onAplicar={aplicarDivisoes}
            onExcluir={excluirDivisao}
          />

          <PortasCard
            vaosSelecionados={vaosSelecionados}
            cores={cores}
            catalogo={catalogo}
            onAplicarCaixaInteira={aplicarPortasCaixaInteira}
            onAplicarVaosSelecionados={aplicarPortasVaosSelecionados}
            onExcluir={excluirPortas}
          />

          <GavetasCard
            vaosSelecionados={vaosSelecionados}
            cores={cores}
            catalogo={catalogo}
            onAplicar={aplicarGavetas}
            onExcluir={excluirGavetas}
          />

          <PuxadorCard
            tipo={box.puxadorPadrao?.tipo ?? "externa"}
            onChange={(tipo) => setBoxCampo({ puxadorPadrao: { tipo } })}
          />

          <div className="card">
            <div className="acoes" style={{ display: "flex", gap: 8 }}>
              <button className="primary" onClick={salvar}>Salvar este módulo como preset</button>
              <button className="danger" disabled={vaosSelecionados.length === 0} onClick={esvaziarVao}>
                Esvaziar vão
              </button>
            </div>
          </div>

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
                onClick={() => trocarModoSelecao("vaos")}
              >
                Selecionar vãos
              </button>
              <button
                className={modoSelecao === "divisoes" ? "primary" : "ghost"}
                onClick={() => trocarModoSelecao("divisoes")}
              >
                Selecionar divisões
              </button>
            </div>
            <BoxCanvas
              box={box}
              modoSelecao={modoSelecao}
              vaosSelecionados={vaosSelecionados}
              onToggleVao={toggleVao}
              divisaoSelecionada={divisaoSelecionada}
              onSelecionarDivisoria={setDivisaoSelecionada}
            />
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
