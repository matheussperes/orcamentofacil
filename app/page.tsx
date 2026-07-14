"use client";

import { useEffect, useMemo, useState } from "react";
import { calcularPreco, type ParametrosComerciais } from "@/lib/engine/pricing";
import { COMERCIAL_PADRAO } from "@/lib/engine/defaults";
import type { EngineOutput } from "@/lib/engine/types";

interface TemplateMeta {
  codigo: string;
  nome: string;
  categoria: string;
  config_padrao: Record<string, number>;
}

interface ModuloUI {
  id: string;
  templateCodigo: string;
  parede: string;
  largura_mm: number;
  altura_mm: number;
  profundidade_mm: number;
  config: Record<string, number>;
}

const PAREDES_PADRAO: Record<string, number> = { A: 3200, B: 2100 };

let seq = 1;
const novoId = () => `m${seq++}`;

function moduloPreset(
  templateCodigo: string,
  parede: string,
  l: number,
  h: number,
  p: number,
  config: Record<string, number> = {}
): ModuloUI {
  return { id: novoId(), templateCodigo, parede, largura_mm: l, altura_mm: h, profundidade_mm: p, config };
}

const PRESET_COZINHA: ModuloUI[] = [
  moduloPreset("CANTO_RETO", "A", 650, 720, 550, { CONFIG_QTD_PORTAS: 1, CONFIG_QTD_PRATELEIRAS: 1 }),
  moduloPreset("BASE_PORTAS", "A", 800, 720, 550, { CONFIG_QTD_PORTAS: 2, CONFIG_QTD_PRATELEIRAS: 1 }),
  moduloPreset("GAVETEIRO", "A", 450, 720, 550, { CONFIG_QTD_GAVETAS: 4 }),
  moduloPreset("BASE_PORTAS", "A", 600, 720, 550, { CONFIG_QTD_PORTAS: 2, CONFIG_QTD_PRATELEIRAS: 1 }),
  moduloPreset("AEREO_PORTAS", "A", 800, 700, 350, { CONFIG_QTD_PORTAS: 2, CONFIG_QTD_PRATELEIRAS: 1 }),
  moduloPreset("AEREO_PORTAS", "A", 800, 700, 350, { CONFIG_QTD_PORTAS: 2, CONFIG_QTD_PRATELEIRAS: 1 }),
  moduloPreset("TORRE_QUENTE", "B", 700, 2200, 600, {
    CONFIG_QTD_PORTAS: 2,
    CONFIG_QTD_PRATELEIRAS: 2,
    CONFIG_QTD_NICHOS_FORNO: 2,
  }),
];

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function Home() {
  const [templates, setTemplates] = useState<TemplateMeta[]>([]);
  const [modulos, setModulos] = useState<ModuloUI[]>(PRESET_COZINHA);
  const [paredes, setParedes] = useState<Record<string, number>>(PAREDES_PADRAO);
  const [engine, setEngine] = useState<EngineOutput | null>(null);
  const [tempoMs, setTempoMs] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [comercial, setComercial] = useState<ParametrosComerciais>(COMERCIAL_PADRAO);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates))
      .catch(() => {});
  }, []);

  const templateMeta = (codigo: string) => templates.find((t) => t.codigo === codigo);

  async function calcular() {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ambiente: { tipo: "Cozinha" },
          modulos: modulos.map((m) => ({
            id: m.id,
            templateCodigo: m.templateCodigo,
            parede: m.parede,
            largura_mm: m.largura_mm,
            altura_mm: m.altura_mm,
            profundidade_mm: m.profundidade_mm,
            config: m.config,
          })),
          comercial,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro ?? "Erro no cálculo.");
        setEngine(null);
        return;
      }
      setEngine(data.engine);
      setTempoMs(data.tempoMs);
    } catch {
      setErro("Falha de conexão com a API.");
    } finally {
      setCarregando(false);
    }
  }

  // Simulador de margem: recalcula o preço no cliente sem reprocessar a
  // engenharia (doc 05).
  const financeiro = useMemo(
    () => (engine ? calcularPreco(engine, comercial) : null),
    [engine, comercial]
  );

  function atualizar(id: string, patch: Partial<ModuloUI>) {
    setModulos((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function atualizarConfig(id: string, chave: string, valor: number) {
    setModulos((ms) =>
      ms.map((m) => (m.id === id ? { ...m, config: { ...m.config, [chave]: valor } } : m))
    );
  }
  function duplicar(id: string) {
    setModulos((ms) => {
      const i = ms.findIndex((m) => m.id === id);
      if (i < 0) return ms;
      const copia = { ...ms[i], id: novoId(), config: { ...ms[i].config } };
      return [...ms.slice(0, i + 1), copia, ...ms.slice(i + 1)];
    });
  }
  function excluir(id: string) {
    setModulos((ms) => ms.filter((m) => m.id !== id));
  }
  function adicionar() {
    const t = templates[0];
    if (!t) return;
    setModulos((ms) => [
      ...ms,
      moduloPreset(t.codigo, "A", 600, 720, 550, { ...t.config_padrao }),
    ]);
  }

  // Barras de ocupação por parede e por tipologia (piso x aéreo).
  const barras = useMemo(() => {
    const grupos: { parede: string; tipo: "Piso" | "Aéreo"; largura: number; itens: ModuloUI[] }[] = [];
    for (const parede of Object.keys(paredes)) {
      for (const tipo of ["Piso", "Aéreo"] as const) {
        const itens = modulos.filter((m) => {
          if (m.parede !== parede) return false;
          const cat = templateMeta(m.templateCodigo)?.categoria;
          const ehAereo = cat === "superior";
          return tipo === "Aéreo" ? ehAereo : !ehAereo;
        });
        if (itens.length) grupos.push({ parede, tipo, largura: paredes[parede], itens });
      }
    }
    return grupos;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modulos, paredes, templates]);

  return (
    <div className="wrap">
      <header className="top">
        <h1>Budget Planner AI</h1>
        <p>
          Motor paramétrico de orçamento — do módulo ao preço em segundos.
          Demonstração do MVP (docs 04–06).
        </p>
      </header>

      <div className="toolbar">
        <button className="primary" onClick={calcular} disabled={carregando}>
          {carregando ? "Calculando…" : "Calcular orçamento"}
        </button>
        <button onClick={adicionar}>+ Adicionar módulo</button>
        <button className="ghost" onClick={() => setModulos(PRESET_COZINHA.map((m) => ({ ...m, id: novoId(), config: { ...m.config } })))}>
          Recarregar preset "Cozinha em L"
        </button>
      </div>

      {erro && <div className="aviso erro">{erro}</div>}

      <div className="grid">
        {/* Coluna esquerda: módulos + barra de ocupação */}
        <div>
          <div className="card">
            <h2>Paredes do ambiente</h2>
            <div className="campos">
              {Object.keys(paredes).map((p) => (
                <div key={p}>
                  <label>Parede {p} (mm)</label>
                  <input
                    type="number"
                    value={paredes[p]}
                    onChange={(e) =>
                      setParedes((prev) => ({ ...prev, [p]: Number(e.target.value) }))
                    }
                  />
                </div>
              ))}
            </div>

            {barras.map((b) => {
              const total = b.itens.reduce((s, m) => s + m.largura_mm, 0);
              const sobra = b.largura - total;
              const estouro = sobra < 0;
              return (
                <div key={`${b.parede}-${b.tipo}`}>
                  <div className="parede-label">
                    <span>
                      Parede {b.parede} · {b.tipo}
                    </span>
                    <span className={estouro ? "" : "muted"} style={estouro ? { color: "var(--red)" } : {}}>
                      {estouro
                        ? `estouro de ${Math.abs(sobra)}mm`
                        : `sobra ${sobra}mm`}
                    </span>
                  </div>
                  <div className={`barra ${estouro ? "estouro" : "ok"}`}>
                    {b.itens.map((m) => (
                      <div
                        key={m.id}
                        className="seg"
                        style={{ width: `${(m.largura_mm / b.largura) * 100}%` }}
                        title={`${m.templateCodigo} ${m.largura_mm}mm`}
                      >
                        {m.largura_mm}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <h2>Módulos ({modulos.length})</h2>
            {modulos.map((m) => {
              const meta = templateMeta(m.templateCodigo);
              return (
                <div className="modulo" key={m.id}>
                  <div className="linha">
                    <select
                      className="nome"
                      value={m.templateCodigo}
                      onChange={(e) => {
                        const t = templateMeta(e.target.value);
                        atualizar(m.id, {
                          templateCodigo: e.target.value,
                          config: { ...(t?.config_padrao ?? {}) },
                        });
                      }}
                    >
                      {templates.map((t) => (
                        <option key={t.codigo} value={t.codigo}>
                          {t.nome}
                        </option>
                      ))}
                    </select>
                    <select
                      value={m.parede}
                      onChange={(e) => atualizar(m.id, { parede: e.target.value })}
                      style={{ width: 70 }}
                    >
                      {Object.keys(paredes).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <div className="acoes">
                      <button onClick={() => duplicar(m.id)}>Duplicar</button>
                      <button className="danger" onClick={() => excluir(m.id)}>
                        Excluir
                      </button>
                    </div>
                  </div>
                  <div className="campos">
                    <div>
                      <label>Largura (mm)</label>
                      <input
                        type="number"
                        value={m.largura_mm}
                        onChange={(e) => atualizar(m.id, { largura_mm: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label>Altura (mm)</label>
                      <input
                        type="number"
                        value={m.altura_mm}
                        onChange={(e) => atualizar(m.id, { altura_mm: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label>Prof. (mm)</label>
                      <input
                        type="number"
                        value={m.profundidade_mm}
                        onChange={(e) =>
                          atualizar(m.id, { profundidade_mm: Number(e.target.value) })
                        }
                      />
                    </div>
                    {Object.keys(meta?.config_padrao ?? m.config).map((chave) => (
                      <div key={chave}>
                        <label>{chave.replace("CONFIG_QTD_", "").replace("CONFIG_", "")}</label>
                        <input
                          type="number"
                          value={m.config[chave] ?? 0}
                          onChange={(e) => atualizarConfig(m.id, chave, Number(e.target.value))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna direita: resultado */}
        <div>
          <div className="card">
            <h2>Simulação comercial</h2>
            <Slider
              rotulo="Margem"
              valor={comercial.margem}
              min={0}
              max={0.7}
              onChange={(v) => setComercial((c) => ({ ...c, margem: v }))}
            />
            <Slider
              rotulo="Desconto"
              valor={comercial.desconto}
              min={0}
              max={0.3}
              onChange={(v) => setComercial((c) => ({ ...c, desconto: v }))}
            />
            <div className="muted" style={{ fontSize: 12 }}>
              Impostos {pct(comercial.impostos)} · Comissão {pct(comercial.comissao)} ·
              Margem mínima {pct(comercial.margemMinima)}
            </div>
          </div>

          {financeiro && (
            <>
              <div className="card">
                <h2>Resultado</h2>
                <div className="kpis">
                  <div className="kpi destaque">
                    <div className="rot">Preço final</div>
                    <div className="val">{brl(financeiro.precoComDesconto)}</div>
                  </div>
                  <div className="kpi">
                    <div className="rot">Custo direto</div>
                    <div className="val">{brl(financeiro.custoDireto)}</div>
                  </div>
                  <div className="kpi">
                    <div className="rot">Lucro bruto</div>
                    <div className="val">{brl(financeiro.lucroBruto)}</div>
                  </div>
                  <div
                    className="kpi"
                    style={
                      financeiro.abaixoDaMargemMinima ? { borderColor: "var(--red)" } : {}
                    }
                  >
                    <div className="rot">Margem efetiva</div>
                    <div className="val">{pct(financeiro.margemEfetiva)}</div>
                  </div>
                </div>
                {financeiro.avisos.map((a, i) => (
                  <div className="aviso" key={i} style={{ marginTop: 10 }}>
                    {a}
                  </div>
                ))}
                {tempoMs !== null && (
                  <div className="tempo">
                    Engenharia calculada em {tempoMs}ms (alvo &lt; 2000ms).
                  </div>
                )}
              </div>

              <div className="card">
                <h2>Composição do custo</h2>
                <table>
                  <tbody>
                    {financeiro.detalhes.map((d) => (
                      <tr key={d.descricao}>
                        <td>{d.descricao}</td>
                        <td className="num">{brl(d.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {engine && (
            <div className="card">
              <h2>Lista de materiais (BOM)</h2>
              <table>
                <thead>
                  <tr>
                    <th>MDF (cor · esp.)</th>
                    <th className="num">Área m²</th>
                    <th className="num">Chapas</th>
                  </tr>
                </thead>
                <tbody>
                  {engine.consolidado.mdf.map((g, i) => (
                    <tr key={i}>
                      <td>
                        {g.cor} · {g.espessura_mm}mm
                      </td>
                      <td className="num">{g.area_m2.toFixed(2)}</td>
                      <td className="num">{g.chapas}</td>
                    </tr>
                  ))}
                  <tr>
                    <td>
                      <strong>Fita de borda</strong>
                    </td>
                    <td className="num" colSpan={2}>
                      {engine.consolidado.fitaTotalM.toFixed(1)} m
                    </td>
                  </tr>
                </tbody>
              </table>

              <table style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Ferragem / acessório</th>
                    <th className="num">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {engine.consolidado.ferragens.map((f) => (
                    <tr key={f.item}>
                      <td>{f.item}</td>
                      <td className="num">{f.quantidade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {engine.warnings.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {engine.warnings.map((w, i) => (
                    <div className={`aviso ${w.severidade === "erro" ? "erro" : ""}`} key={i}>
                      {w.mensagem}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="footer">
        Documentação completa do pipeline em <code>/docs</code>. Biblioteca de
        engenharia em <code>/engine/templates</code>. Este é um MVP de
        demonstração do motor — persistência, autenticação e PDF são as próximas
        etapas (ver <code>DEPLOY.md</code>).
      </div>
    </div>
  );
}

function Slider({
  rotulo,
  valor,
  min,
  max,
  onChange,
}: {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="slider-row">
      <label style={{ width: 70 }}>{rotulo}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={valor}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="v">{(valor * 100).toFixed(0)}%</span>
    </div>
  );
}
