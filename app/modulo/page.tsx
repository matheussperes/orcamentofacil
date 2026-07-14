"use client";

import { useEffect, useMemo, useState } from "react";
import { BoxCanvas } from "../components/BoxCanvas";
import {
  calcularOrcamentoBox,
  vaoVazio,
  type BayContent,
  type BoxModule,
  type CarcassType,
  type SentidoPorta,
} from "@/lib/engine/box";
import {
  acharVao,
  definirConteudo,
  dividirVao,
  limparVao,
} from "@/lib/engine/box/tree";
import {
  carregarCatalogo,
  catalogoParaPrecos,
  coresDisponiveis,
  espessurasDaCor,
  type Catalogo,
} from "@/lib/catalog";
import { montarLinhasInsumos } from "@/lib/insumos";
import { calcularPreco } from "@/lib/engine/pricing";
import { COMERCIAL_PADRAO, PARAMETROS_FABRICA_PADRAO } from "@/lib/engine/defaults";
import {
  listarPresets,
  removerPreset,
  salvarPreset,
  type BoxPreset,
} from "@/lib/boxPresets";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function caixaInicial(cor: string): BoxModule {
  return {
    id: "box-1",
    nome: "Módulo novo",
    tipo: "inferior",
    largura: 800,
    altura: 720,
    profundidade: 550,
    caixa: { cor, espessura: 15 },
    raiz: vaoVazio("raiz"),
  };
}

type TipoConteudo = BayContent["tipo"];

export default function EditorModulo() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [box, setBox] = useState<BoxModule>(() => caixaInicial("Branco TX"));
  const [sel, setSel] = useState<string | null>("raiz");
  const [presets, setPresets] = useState<BoxPreset[]>([]);

  // Controles do vão selecionado.
  const [splitQtd, setSplitQtd] = useState(1);
  const [tipoConteudo, setTipoConteudo] = useState<TipoConteudo>("portas");
  const [form, setForm] = useState<Record<string, number | string | boolean>>({
    qtd: 2,
    sentido: "direita",
    cor: "Branco TX",
    espessura: 18,
    profundidade: 450,
    interna: false,
    recuo: 20,
    lado: "direito",
    sarrafo: false,
  });

  useEffect(() => {
    const cat = carregarCatalogo();
    setCatalogo(cat);
    setPresets(listarPresets());
    const branco = coresDisponiveis(cat).find((c) => c.toLowerCase().includes("branco"));
    if (branco) {
      setBox((b) => ({ ...b, caixa: { ...b.caixa, cor: branco } }));
      setForm((f) => ({ ...f, cor: branco }));
    }
  }, []);

  const cores = catalogo ? coresDisponiveis(catalogo) : ["Branco TX", "Louro Freijó"];

  const nodeSel = sel ? acharVao(box.raiz, sel) : null;
  const ehFolha = nodeSel?.split === "none";

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

  function setBoxCampo(patch: Partial<BoxModule>) {
    setBox((b) => ({ ...b, ...patch }));
  }

  function dividir(split: "vertical" | "horizontal") {
    if (!sel) return;
    setBox((b) => ({ ...b, raiz: dividirVao(b.raiz, sel, split, splitQtd) }));
  }

  function aplicarConteudo() {
    if (!sel) return;
    const content = montarConteudo();
    setBox((b) => ({ ...b, raiz: definirConteudo(b.raiz, sel, content) }));
  }

  function montarConteudo(): BayContent {
    const f = form;
    switch (tipoConteudo) {
      case "portas":
        return {
          tipo: "portas",
          qtd: Number(f.qtd),
          sentidos: Array(Number(f.qtd)).fill(f.sentido as SentidoPorta),
          material: { cor: String(f.cor), espessura: Number(f.espessura) },
        };
      case "gaveta":
        return {
          tipo: "gaveta",
          qtd: Number(f.qtd),
          profundidade: Number(f.profundidade),
          interna: Boolean(f.interna),
          corFrente: String(f.cor),
          espessuraFrente: Number(f.espessura),
        };
      case "prateleira":
        return { tipo: "prateleira", qtd: Number(f.qtd), recuo: Number(f.recuo) };
      case "fundo":
        return { tipo: "fundo", espessura: Number(f.espessura) };
      case "tamponamento":
        return {
          tipo: "tamponamento",
          lado: f.lado as "direito" | "esquerdo" | "superior" | "inferior",
          material: { cor: String(f.cor), espessura: Number(f.espessura) },
          sarrafo: Boolean(f.sarrafo),
        };
      default:
        return { tipo: "vazio" };
    }
  }

  function limpar() {
    if (!sel) return;
    setBox((b) => ({ ...b, raiz: limparVao(b.raiz, sel) }));
  }

  function salvar() {
    const p = salvarPreset(box.nome || "Módulo", box);
    setPresets(listarPresets());
    alert(`Preset "${p.nome}" salvo. Ficará disponível ao criar módulos.`);
  }
  function aplicarPreset(p: BoxPreset) {
    setBox({ ...p.box, id: box.id });
    setSel(p.box.raiz.id);
  }
  function excluirPreset(id: string) {
    removerPreset(id);
    setPresets(listarPresets());
  }

  const setF = (k: string, v: number | string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="wrap">
      <header className="top">
        <h1>Editor de módulo (caixa + subdivisões)</h1>
        <p>
          Monte a caixa vazia e vá inserindo divisórias e conteúdos em cada vão.{" "}
          <a href="/">← calculadora</a> · <a href="/configuracoes/materiais">Materiais</a>
        </p>
      </header>

      <div className="grid">
        {/* Esquerda: definição da caixa + canvas */}
        <div>
          <div className="card">
            <h2>Caixa</h2>
            <div className="campos">
              <div>
                <label>Nome</label>
                <input value={box.nome} onChange={(e) => setBoxCampo({ nome: e.target.value })} />
              </div>
              <div>
                <label>Tipo</label>
                <select
                  value={box.tipo}
                  onChange={(e) => setBoxCampo({ tipo: e.target.value as CarcassType })}
                >
                  <option value="aereo">Aéreo</option>
                  <option value="inferior">Inferior</option>
                  <option value="torre">Torre</option>
                </select>
              </div>
              <div>
                <label>Largura (mm)</label>
                <input type="number" value={box.largura} onChange={(e) => setBoxCampo({ largura: Number(e.target.value) })} />
              </div>
              <div>
                <label>Altura (mm)</label>
                <input type="number" value={box.altura} onChange={(e) => setBoxCampo({ altura: Number(e.target.value) })} />
              </div>
              <div>
                <label>Profundidade (mm)</label>
                <input type="number" value={box.profundidade} onChange={(e) => setBoxCampo({ profundidade: Number(e.target.value) })} />
              </div>
              <div>
                <label>Cor da caixa</label>
                <select value={box.caixa.cor} onChange={(e) => setBoxCampo({ caixa: { ...box.caixa, cor: e.target.value } })}>
                  {cores.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Espessura caixa</label>
                <select value={box.caixa.espessura} onChange={(e) => setBoxCampo({ caixa: { ...box.caixa, espessura: Number(e.target.value) } })}>
                  {[15, 18].map((e2) => (
                    <option key={e2} value={e2}>{e2} mm</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Vãos (clique para selecionar)</h2>
            <BoxCanvas box={box} selecionado={sel} onSelecionar={setSel} />
          </div>
        </div>

        {/* Direita: ações do vão + custo */}
        <div>
          <div className="card">
            <h2>Vão selecionado</h2>
            {!sel && <p className="muted">Clique em um vão no desenho.</p>}
            {sel && (
              <>
                <div className="slider-row">
                  <label style={{ width: 90 }}>Nº divisórias</label>
                  <input
                    type="number"
                    min={1}
                    value={splitQtd}
                    onChange={(e) => setSplitQtd(Number(e.target.value))}
                    style={{ width: 70 }}
                  />
                  <button onClick={() => dividir("vertical")}>Dividir vertical</button>
                  <button onClick={() => dividir("horizontal")}>Dividir horizontal</button>
                </div>

                {ehFolha ? (
                  <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    <label>Conteúdo do vão</label>
                    <select
                      value={tipoConteudo}
                      onChange={(e) => setTipoConteudo(e.target.value as TipoConteudo)}
                    >
                      <option value="portas">Portas</option>
                      <option value="gaveta">Gaveta</option>
                      <option value="prateleira">Prateleira</option>
                      <option value="fundo">Fundo</option>
                      <option value="tamponamento">Tamponamento</option>
                    </select>

                    <div className="campos" style={{ marginTop: 8 }}>
                      {(tipoConteudo === "portas" ||
                        tipoConteudo === "gaveta" ||
                        tipoConteudo === "prateleira") && (
                        <div>
                          <label>Quantidade</label>
                          <input type="number" min={1} value={Number(form.qtd)} onChange={(e) => setF("qtd", Number(e.target.value))} />
                        </div>
                      )}
                      {tipoConteudo === "portas" && (
                        <div>
                          <label>Sentido</label>
                          <select value={String(form.sentido)} onChange={(e) => setF("sentido", e.target.value)}>
                            <option value="direita">Direita</option>
                            <option value="esquerda">Esquerda</option>
                            <option value="basculante">Basculante</option>
                            <option value="cava">Cava (sem puxador)</option>
                          </select>
                        </div>
                      )}
                      {tipoConteudo === "gaveta" && (
                        <>
                          <div>
                            <label>Profundidade</label>
                            <input type="number" value={Number(form.profundidade)} onChange={(e) => setF("profundidade", Number(e.target.value))} />
                          </div>
                          <div>
                            <label>Tipo</label>
                            <select value={form.interna ? "int" : "ext"} onChange={(e) => setF("interna", e.target.value === "int")}>
                              <option value="ext">Externa</option>
                              <option value="int">Interna (guarda-roupa)</option>
                            </select>
                          </div>
                        </>
                      )}
                      {tipoConteudo === "prateleira" && (
                        <div>
                          <label>Recuo frontal</label>
                          <input type="number" value={Number(form.recuo)} onChange={(e) => setF("recuo", Number(e.target.value))} />
                        </div>
                      )}
                      {tipoConteudo === "tamponamento" && (
                        <>
                          <div>
                            <label>Lado</label>
                            <select value={String(form.lado)} onChange={(e) => setF("lado", e.target.value)}>
                              <option value="direito">Direito</option>
                              <option value="esquerdo">Esquerdo</option>
                              <option value="superior">Superior</option>
                              <option value="inferior">Inferior</option>
                            </select>
                          </div>
                          <div>
                            <label>Sarrafo?</label>
                            <select value={form.sarrafo ? "s" : "n"} onChange={(e) => setF("sarrafo", e.target.value === "s")}>
                              <option value="n">Inteiriça</option>
                              <option value="s">Sarrafo</option>
                            </select>
                          </div>
                        </>
                      )}
                      {(tipoConteudo === "portas" ||
                        tipoConteudo === "fundo" ||
                        tipoConteudo === "tamponamento" ||
                        (tipoConteudo === "gaveta" && !form.interna)) && (
                        <>
                          {tipoConteudo !== "fundo" && (
                            <div>
                              <label>Cor</label>
                              <select value={String(form.cor)} onChange={(e) => setF("cor", e.target.value)}>
                                {cores.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div>
                            <label>Espessura</label>
                            <select
                              value={Number(form.espessura)}
                              onChange={(e) => setF("espessura", Number(e.target.value))}
                            >
                              {(catalogo && tipoConteudo !== "fundo"
                                ? espessurasDaCor(catalogo, String(form.cor))
                                : [6, 15, 18]
                              ).map((esp) => (
                                <option key={esp} value={esp}>{esp} mm</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="acoes" style={{ marginTop: 10 }}>
                      <button className="primary" onClick={aplicarConteudo}>
                        Aplicar conteúdo
                      </button>
                      <button className="danger" onClick={limpar}>
                        Esvaziar vão
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="muted" style={{ marginTop: 10 }}>
                    Este vão está dividido. Selecione um sub-vão para configurar,
                    ou esvazie para recomeçar.
                  </p>
                )}
              </>
            )}
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
            <h2>Presets</h2>
            <button className="primary" onClick={salvar}>
              Salvar este módulo como preset
            </button>
            {presets.length > 0 && (
              <table style={{ marginTop: 10 }}>
                <tbody>
                  {presets.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nome}</td>
                      <td>
                        <button onClick={() => aplicarPreset(p)}>Aplicar</button>
                      </td>
                      <td style={{ width: 30 }}>
                        <button className="danger" onClick={() => excluirPreset(p.id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
