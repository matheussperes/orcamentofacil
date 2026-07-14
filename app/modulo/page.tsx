"use client";

import { useEffect, useMemo, useState } from "react";
import { BoxCanvas } from "../components/BoxCanvas";
import {
  calcularOrcamentoBox,
  vaoVazio,
  type BayContent,
  type BoxModule,
  type CarcassType,
  type FrenteConteudo,
  type LadoTamponamento,
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
  seedPresetsPadrao,
  type BoxPreset,
} from "@/lib/boxPresets";
import { listarCategorias, adicionarCategoria } from "@/lib/categorias";
import { planoDeCorte } from "@/lib/engine/box/cutting";
import { PlanoCorteCanvas } from "../components/PlanoCorteCanvas";

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

// Estado do formulário do vão selecionado. Campos SEPARADOS por finalidade
// (frente/prateleiras/fundo/tamponamento) porque agora coexistem na mesma
// tela — reaproveitar um único campo "espessura" para tudo causaria colisão
// entre, por ex., a espessura das portas e a espessura do fundo.
interface FormVao {
  modo: "espaco" | "tamponamento";
  frenteTipo: FrenteConteudo["tipo"];
  portasQtd: number;
  portasSentido: SentidoPorta;
  portasCor: string;
  portasEspessura: number;
  gavetaQtd: number;
  gavetaProfundidade: number;
  gavetaInterna: boolean;
  gavetaCor: string;
  gavetaEspessura: number;
  temPrateleiras: boolean;
  prateleirasQtd: number;
  prateleirasRecuo: number;
  temFundo: boolean;
  fundoEspessura: number;
  tampLado: LadoTamponamento;
  tampSarrafo: boolean;
  tampCor: string;
  tampEspessura: number;
}

function formInicial(cor: string): FormVao {
  return {
    modo: "espaco",
    frenteTipo: "portas",
    portasQtd: 2,
    portasSentido: "direita",
    portasCor: cor,
    portasEspessura: 18,
    gavetaQtd: 3,
    gavetaProfundidade: 450,
    gavetaInterna: false,
    gavetaCor: cor,
    gavetaEspessura: 18,
    temPrateleiras: false,
    prateleirasQtd: 1,
    prateleirasRecuo: 20,
    temFundo: false,
    fundoEspessura: 6,
    tampLado: "direito",
    tampSarrafo: false,
    tampCor: cor,
    tampEspessura: 18,
  };
}

export default function EditorModulo() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [box, setBox] = useState<BoxModule>(() => caixaInicial("Branco TX"));
  const [sel, setSel] = useState<string | null>("raiz");
  const [presets, setPresets] = useState<BoxPreset[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaSalvar, setCategoriaSalvar] = useState("Cozinha");
  const [novaCategoria, setNovaCategoria] = useState("");

  const [splitQtd, setSplitQtd] = useState(1);
  const [form, setForm] = useState<FormVao>(() => formInicial("Branco TX"));

  useEffect(() => {
    const cat = carregarCatalogo();
    setCatalogo(cat);
    seedPresetsPadrao();
    setPresets(listarPresets());
    setCategorias(listarCategorias());
    const branco = coresDisponiveis(cat).find((c) => c.toLowerCase().includes("branco"));
    if (branco) {
      setBox((b) => ({ ...b, caixa: { ...b.caixa, cor: branco } }));
      setForm(formInicial(branco));
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

  // Peças técnicas (sem preço) + plano de corte gráfico (Fase 3, Etapa 1).
  const pecas = resultado.engine.porModulo[0]?.pecas ?? [];
  const grupos = useMemo(() => planoDeCorte(pecas), [pecas]);

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
    if (f.modo === "tamponamento") {
      return {
        tipo: "tamponamento",
        lado: f.tampLado,
        material: { cor: f.tampCor, espessura: f.tampEspessura },
        sarrafo: f.tampSarrafo,
      };
    }

    let frente: FrenteConteudo;
    if (f.frenteTipo === "portas") {
      frente = {
        tipo: "portas",
        qtd: f.portasQtd,
        sentidos: Array(f.portasQtd).fill(f.portasSentido),
        material: { cor: f.portasCor, espessura: f.portasEspessura },
      };
    } else if (f.frenteTipo === "gaveta") {
      frente = {
        tipo: "gaveta",
        qtd: f.gavetaQtd,
        profundidade: f.gavetaProfundidade,
        interna: f.gavetaInterna,
        corFrente: f.gavetaCor,
        espessuraFrente: f.gavetaEspessura,
      };
    } else {
      frente = { tipo: "vazio" };
    }

    return {
      tipo: "espaco",
      frente,
      prateleiras: f.temPrateleiras
        ? { qtd: f.prateleirasQtd, recuo: f.prateleirasRecuo }
        : undefined,
      fundo: f.temFundo ? { espessura: f.fundoEspessura } : undefined,
    };
  }

  function limpar() {
    if (!sel) return;
    setBox((b) => ({ ...b, raiz: limparVao(b.raiz, sel) }));
  }

  function salvar() {
    const p = salvarPreset(box.nome || "Módulo", categoriaSalvar, box);
    setPresets(listarPresets());
    alert(
      `Preset "${p.nome}" salvo em "${p.categoria}". Disponível no orçamento em Ambiente → Tipo → Modelo.`
    );
  }
  function criarCategoria() {
    if (!novaCategoria.trim()) return;
    adicionarCategoria(novaCategoria);
    setCategorias(listarCategorias());
    setCategoriaSalvar(novaCategoria.trim());
    setNovaCategoria("");
  }
  function aplicarPreset(p: BoxPreset) {
    setBox({ ...p.box, id: box.id });
    setSel(p.box.raiz.id);
  }
  function excluirPreset(id: string) {
    removerPreset(id);
    setPresets(listarPresets());
  }

  function setF<K extends keyof FormVao>(k: K, v: FormVao[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

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
                    <label>Este vão é</label>
                    <select
                      value={form.modo}
                      onChange={(e) => setF("modo", e.target.value as FormVao["modo"])}
                    >
                      <option value="espaco">Espaço normal (frente + interior)</option>
                      <option value="tamponamento">Painel de tamponamento (lateral estrutural)</option>
                    </select>

                    {form.modo === "espaco" ? (
                      <>
                        {/* Frente: vazio | portas | gaveta — mutuamente exclusivos */}
                        <div style={{ marginTop: 10 }}>
                          <label>Frente</label>
                          <select
                            value={form.frenteTipo}
                            onChange={(e) => setF("frenteTipo", e.target.value as FrenteConteudo["tipo"])}
                          >
                            <option value="vazio">Vazio (nicho aberto)</option>
                            <option value="portas">Portas</option>
                            <option value="gaveta">Gaveta</option>
                          </select>
                        </div>

                        {form.frenteTipo === "portas" && (
                          <div className="campos" style={{ marginTop: 8 }}>
                            <div>
                              <label>Quantidade</label>
                              <input type="number" min={1} value={form.portasQtd} onChange={(e) => setF("portasQtd", Number(e.target.value))} />
                            </div>
                            <div>
                              <label>Sentido</label>
                              <select value={form.portasSentido} onChange={(e) => setF("portasSentido", e.target.value as SentidoPorta)}>
                                <option value="direita">Direita</option>
                                <option value="esquerda">Esquerda</option>
                                <option value="basculante">Basculante</option>
                                <option value="cava">Cava (sem puxador)</option>
                              </select>
                            </div>
                            <div>
                              <label>Cor</label>
                              <select value={form.portasCor} onChange={(e) => setF("portasCor", e.target.value)}>
                                {cores.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            <div>
                              <label>Espessura</label>
                              <select value={form.portasEspessura} onChange={(e) => setF("portasEspessura", Number(e.target.value))}>
                                {(catalogo ? espessurasDaCor(catalogo, form.portasCor) : [15, 18]).map((esp) => (
                                  <option key={esp} value={esp}>{esp} mm</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {form.frenteTipo === "gaveta" && (
                          <div className="campos" style={{ marginTop: 8 }}>
                            <div>
                              <label>Quantidade</label>
                              <input type="number" min={1} value={form.gavetaQtd} onChange={(e) => setF("gavetaQtd", Number(e.target.value))} />
                            </div>
                            <div>
                              <label>Profundidade</label>
                              <input type="number" value={form.gavetaProfundidade} onChange={(e) => setF("gavetaProfundidade", Number(e.target.value))} />
                            </div>
                            <div>
                              <label>Tipo</label>
                              <select value={form.gavetaInterna ? "int" : "ext"} onChange={(e) => setF("gavetaInterna", e.target.value === "int")}>
                                <option value="ext">Externa</option>
                                <option value="int">Interna (guarda-roupa)</option>
                              </select>
                            </div>
                            {!form.gavetaInterna && (
                              <>
                                <div>
                                  <label>Cor</label>
                                  <select value={form.gavetaCor} onChange={(e) => setF("gavetaCor", e.target.value)}>
                                    {cores.map((c) => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label>Espessura</label>
                                  <select value={form.gavetaEspessura} onChange={(e) => setF("gavetaEspessura", Number(e.target.value))}>
                                    {(catalogo ? espessurasDaCor(catalogo, form.gavetaCor) : [15, 18]).map((esp) => (
                                      <option key={esp} value={esp}>{esp} mm</option>
                                    ))}
                                  </select>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Prateleiras e fundo: independentes da frente, sempre visíveis */}
                        <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input type="checkbox" checked={form.temPrateleiras} onChange={(e) => setF("temPrateleiras", e.target.checked)} />
                            Prateleiras internas
                          </label>
                          {form.temPrateleiras && (
                            <div className="campos" style={{ marginTop: 6 }}>
                              <div>
                                <label>Quantidade</label>
                                <input type="number" min={1} value={form.prateleirasQtd} onChange={(e) => setF("prateleirasQtd", Number(e.target.value))} />
                              </div>
                              <div>
                                <label>Recuo frontal</label>
                                <input type="number" value={form.prateleirasRecuo} onChange={(e) => setF("prateleirasRecuo", Number(e.target.value))} />
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ marginTop: 10 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <input type="checkbox" checked={form.temFundo} onChange={(e) => setF("temFundo", e.target.checked)} />
                            Tem fundo
                          </label>
                          {form.temFundo && (
                            <div className="campos" style={{ marginTop: 6 }}>
                              <div>
                                <label>Espessura</label>
                                <select value={form.fundoEspessura} onChange={(e) => setF("fundoEspessura", Number(e.target.value))}>
                                  {[6, 15].map((esp) => <option key={esp} value={esp}>{esp} mm</option>)}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="campos" style={{ marginTop: 8 }}>
                        <div>
                          <label>Lado</label>
                          <select value={form.tampLado} onChange={(e) => setF("tampLado", e.target.value as LadoTamponamento)}>
                            <option value="direito">Direito</option>
                            <option value="esquerdo">Esquerdo</option>
                            <option value="superior">Superior</option>
                            <option value="inferior">Inferior</option>
                          </select>
                        </div>
                        <div>
                          <label>Montagem</label>
                          <select value={form.tampSarrafo ? "s" : "n"} onChange={(e) => setF("tampSarrafo", e.target.value === "s")}>
                            <option value="n">Inteiriça</option>
                            <option value="s">Sarrafo</option>
                          </select>
                        </div>
                        <div>
                          <label>Cor</label>
                          <select value={form.tampCor} onChange={(e) => setF("tampCor", e.target.value)}>
                            {cores.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label>Espessura</label>
                          <select value={form.tampEspessura} onChange={(e) => setF("tampEspessura", Number(e.target.value))}>
                            {(catalogo ? espessurasDaCor(catalogo, form.tampCor) : [15, 18]).map((esp) => (
                              <option key={esp} value={esp}>{esp} mm</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

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

          <div className="card">
            <h2>Presets — o editor é a fonte da verdade</h2>
            <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
              Todo módulo salvo aqui, com sua categoria, fica disponível no
              orçamento em Ambiente → Tipo → Modelo.
            </p>
            <div className="campos">
              <div>
                <label>Categoria / ambiente</label>
                <select value={categoriaSalvar} onChange={(e) => setCategoriaSalvar(e.target.value)}>
                  {categorias.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Nova categoria</label>
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    value={novaCategoria}
                    placeholder="ex.: Escritório"
                    onChange={(e) => setNovaCategoria(e.target.value)}
                  />
                  <button onClick={criarCategoria}>+</button>
                </div>
              </div>
            </div>
            <button className="primary" style={{ marginTop: 10 }} onClick={salvar}>
              Salvar este módulo como preset
            </button>
            {presets.length > 0 && (
              <table style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Categoria</th>
                    <th>Tipo</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {presets.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nome}</td>
                      <td className="muted">{p.categoria}</td>
                      <td className="muted">{p.box.tipo}</td>
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
