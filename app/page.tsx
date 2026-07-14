"use client";

import { useEffect, useMemo, useState } from "react";
import { calcularPreco, type ParametrosComerciais } from "@/lib/engine/pricing";
import {
  COMERCIAL_PADRAO,
  MATERIAIS_PADRAO,
  PARAMETROS_FABRICA_PADRAO,
} from "@/lib/engine/defaults";
import type {
  ConfiguracaoMaterialModulo,
  EngineOutput,
  ModuloInstanciado,
} from "@/lib/engine/types";
import type { BoxModule } from "@/lib/engine/box/types";
import {
  calcularOrcamentoMisto,
  idDoItem,
  paredeDoItem,
  larguraDoItem,
  alturaDoItem,
  profundidadeDoItem,
  corExternaDoItem,
  type ModuloOrcamento,
} from "@/lib/orcamento";
import { listarPresets, type BoxPreset } from "@/lib/boxPresets";
import {
  carregarCatalogo,
  catalogoParaPrecos,
  coresDisponiveis,
  espessurasDaCor,
  type Catalogo,
} from "@/lib/catalog";
import { carregarOverrides } from "@/lib/templateOverrides";
import { montarLinhasInsumos } from "@/lib/insumos";
import { ModulePreview } from "./components/ModulePreview";
import { LayoutVisualizer, type LayoutModulo } from "./components/LayoutVisualizer";

interface TemplateMeta {
  codigo: string;
  nome: string;
  categoria: string;
  config_padrao: Record<string, number>;
}

const PAREDES_PADRAO: Record<string, number> = { A: 3200, B: 2100 };

let seq = 1;
const novoId = () => `m${seq++}`;

function itemTemplatePreset(
  templateCodigo: string,
  parede: string,
  l: number,
  h: number,
  p: number,
  config: Record<string, number> = {}
): ModuloOrcamento {
  return {
    origem: "template",
    modulo: {
      id: novoId(),
      templateCodigo,
      parede,
      largura_mm: l,
      altura_mm: h,
      profundidade_mm: p,
      config,
    },
  };
}

/** Cópia editável de um item (novo id), preservando a origem. */
function clonarItem(it: ModuloOrcamento): ModuloOrcamento {
  if (it.origem === "template") {
    return {
      origem: "template",
      modulo: {
        ...it.modulo,
        id: novoId(),
        config: { ...(it.modulo.config ?? {}) },
        configMaterial: it.modulo.configMaterial
          ? { ...it.modulo.configMaterial }
          : undefined,
      },
    };
  }
  const box: BoxModule = JSON.parse(JSON.stringify(it.box));
  box.id = novoId();
  return { origem: "custom_box", box };
}

const PRESET_COZINHA: ModuloOrcamento[] = [
  itemTemplatePreset("CANTO_RETO", "A", 650, 720, 550, { CONFIG_QTD_PORTAS: 1, CONFIG_QTD_PRATELEIRAS: 1 }),
  itemTemplatePreset("BASE_PORTAS", "A", 800, 720, 550, { CONFIG_QTD_PORTAS: 2, CONFIG_QTD_PRATELEIRAS: 1 }),
  itemTemplatePreset("GAVETEIRO", "A", 450, 720, 550, { CONFIG_QTD_GAVETAS: 4 }),
  itemTemplatePreset("BASE_PORTAS", "A", 600, 720, 550, { CONFIG_QTD_PORTAS: 2, CONFIG_QTD_PRATELEIRAS: 1 }),
  itemTemplatePreset("AEREO_PORTAS", "A", 800, 700, 350, { CONFIG_QTD_PORTAS: 2, CONFIG_QTD_PRATELEIRAS: 1 }),
  itemTemplatePreset("AEREO_PORTAS", "A", 800, 700, 350, { CONFIG_QTD_PORTAS: 2, CONFIG_QTD_PRATELEIRAS: 1 }),
  itemTemplatePreset("TORRE_QUENTE", "B", 700, 2200, 600, {
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
  // Lista única e polimórfica: cada item é um módulo de template ou uma
  // caixa customizada (V3), diferenciados por `origem`. Sem estado paralelo.
  const [itens, setItens] = useState<ModuloOrcamento[]>(PRESET_COZINHA);
  const [presets, setPresets] = useState<BoxPreset[]>([]);
  const [paredes, setParedes] = useState<Record<string, number>>(PAREDES_PADRAO);
  const [engine, setEngine] = useState<EngineOutput | null>(null);
  const [tempoMs, setTempoMs] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);

  const [comercial, setComercial] = useState<ParametrosComerciais>(COMERCIAL_PADRAO);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates))
      .catch(() => {});
    setCatalogo(carregarCatalogo());
    setPresets(listarPresets());
  }, []);

  const templateMeta = (codigo: string) => templates.find((t) => t.codigo === codigo);
  const precos = useMemo(
    () => (catalogo ? catalogoParaPrecos(catalogo) : undefined),
    [catalogo]
  );

  // Cálculo no cliente: a lista única já mistura templates e caixas — o
  // orquestrador separa e combina internamente numa única saída consolidada.
  function calcular() {
    setCarregando(true);
    setErro(null);
    try {
      const overrides = carregarOverrides();
      const t0 = performance.now();
      const result = calcularOrcamentoMisto({
        ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
        parametros: PARAMETROS_FABRICA_PADRAO,
        itens,
        templates: Object.keys(overrides).length ? overrides : undefined,
      });
      setEngine(result);
      setTempoMs(Math.round(performance.now() - t0));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro no cálculo.");
      setEngine(null);
    } finally {
      setCarregando(false);
    }
  }

  // Simulador de margem: recalcula o preço no cliente sem reprocessar a
  // engenharia (doc 05). Usa os preços do catálogo do usuário (V2-6).
  const financeiro = useMemo(
    () => (engine ? calcularPreco(engine, comercial, precos) : null),
    [engine, comercial, precos]
  );

  const insumos = useMemo(
    () =>
      engine && precos
        ? montarLinhasInsumos(engine, precos, { incluirServicos: true })
        : null,
    [engine, precos]
  );

  function gerarProposta(fin: ReturnType<typeof calcularPreco>) {
    if (!engine) return;
    const payload = {
      geradoEm: new Date().toISOString(),
      ambiente: "Cozinha",
      cliente: "Cliente exemplo",
      engine,
      financeiro: fin,
      comercial,
    };
    sessionStorage.setItem("proposta", JSON.stringify(payload));
    window.open("/proposta", "_blank");
  }

  function atualizarTemplateModulo(id: string, patch: Partial<ModuloInstanciado>) {
    setItens((its) =>
      its.map((it) =>
        it.origem === "template" && it.modulo.id === id
          ? { ...it, modulo: { ...it.modulo, ...patch } }
          : it
      )
    );
  }
  function atualizarTemplateConfig(id: string, chave: string, valor: number) {
    setItens((its) =>
      its.map((it) =>
        it.origem === "template" && it.modulo.id === id
          ? { ...it, modulo: { ...it.modulo, config: { ...it.modulo.config, [chave]: valor } } }
          : it
      )
    );
  }
  function atualizarTemplateMaterial(id: string, cm: ConfiguracaoMaterialModulo | undefined) {
    setItens((its) =>
      its.map((it) =>
        it.origem === "template" && it.modulo.id === id
          ? { ...it, modulo: { ...it.modulo, configMaterial: cm } }
          : it
      )
    );
  }
  function atualizarBoxCampo(id: string, patch: Partial<BoxModule>) {
    setItens((its) =>
      its.map((it) =>
        it.origem === "custom_box" && it.box.id === id
          ? { ...it, box: { ...it.box, ...patch } }
          : it
      )
    );
  }
  function duplicar(id: string) {
    setItens((its) => {
      const i = its.findIndex((it) => idDoItem(it) === id);
      if (i < 0) return its;
      const copia = clonarItem(its[i]);
      return [...its.slice(0, i + 1), copia, ...its.slice(i + 1)];
    });
  }
  function excluir(id: string) {
    setItens((its) => its.filter((it) => idDoItem(it) !== id));
  }
  function adicionar() {
    const t = templates[0];
    if (!t) return;
    setItens((its) => [...its, itemTemplatePreset(t.codigo, "A", 600, 720, 550, { ...t.config_padrao })]);
  }
  // Instancia um preset do editor de caixa (V3) como cópia editável.
  function adicionarBox(p: BoxPreset) {
    const clone: BoxModule = JSON.parse(JSON.stringify(p.box));
    clone.id = novoId();
    clone.parede = clone.parede ?? "A";
    setItens((its) => [...its, { origem: "custom_box", box: clone }]);
  }

  // Projeção unificada para a barra/canvas de layout (V2-3), lida a partir da
  // única lista de itens via os acessores de lib/orcamento.
  const layoutModulos: LayoutModulo[] = useMemo(
    () =>
      itens.map((it) => ({
        id: idDoItem(it),
        parede: paredeDoItem(it),
        largura_mm: larguraDoItem(it),
        altura_mm: alturaDoItem(it),
        profundidade_mm: profundidadeDoItem(it),
        categoria:
          it.origem === "template"
            ? templateMeta(it.modulo.templateCodigo)?.categoria ?? "inferior"
            : it.box.tipo === "aereo"
            ? "superior"
            : "inferior",
        cor: corExternaDoItem(it),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itens, templates]
  );

  return (
    <div className="wrap">
      <header className="top">
        <h1>Budget Planner AI</h1>
        <p>
          Motor paramétrico de orçamento — do módulo ao preço em segundos.{" "}
          <a href="/modulo">Editor de módulo (V3)</a> ·{" "}
          <a href="/configuracoes/materiais">Materiais</a> ·{" "}
          <a href="/configuracoes/engenharia">Engenharia</a>
        </p>
      </header>

      <div className="toolbar">
        <button className="primary" onClick={calcular} disabled={carregando}>
          {carregando ? "Calculando…" : "Criar orçamento"}
        </button>
        <button onClick={adicionar}>+ Adicionar módulo (template)</button>
        {presets.length > 0 && (
          <select
            defaultValue=""
            onChange={(e) => {
              const p = presets.find((x) => x.id === e.target.value);
              if (p) adicionarBox(p);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              + Adicionar caixa (preset)…
            </option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        )}
        <button className="ghost" onClick={() => setItens(PRESET_COZINHA.map(clonarItem))}>
          Recarregar preset "Cozinha em L"
        </button>
      </div>
      {presets.length === 0 && (
        <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Dica: monte módulos no{" "}
          <a href="/modulo">editor de caixa (V3)</a>, salve como preset e eles
          aparecerão aqui para adicionar ao orçamento.
        </div>
      )}

      {erro && <div className="aviso erro">{erro}</div>}

      {/* Painel de Ocupação e Layout — cockpit único (paredes + Canvas 2D). A
          sobra/estouro de cada parede é desenhada direto no Canvas. */}
      <div className="card">
        <h2>Painel de ocupação e layout</h2>
        <div className="campos" style={{ marginBottom: 10 }}>
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
        <LayoutVisualizer modulos={layoutModulos} paredes={paredes} />
      </div>

      <div className="grid">
        {/* Coluna esquerda: lista única de módulos */}
        <div>
          <div className="card">
            <h2>Módulos ({itens.length})</h2>
            {itens.map((it) => {
              const id = idDoItem(it);
              return (
                <div className="modulo" key={id}>
                  {it.origem === "template" ? (
                    <TemplateModuloCard
                      modulo={it.modulo}
                      templates={templates}
                      paredes={paredes}
                      catalogo={catalogo}
                      onAtualizar={(patch) => atualizarTemplateModulo(id, patch)}
                      onAtualizarConfig={(chave, valor) =>
                        atualizarTemplateConfig(id, chave, valor)
                      }
                      onAtualizarMaterial={(cm) => atualizarTemplateMaterial(id, cm)}
                    />
                  ) : (
                    <BoxModuloCard
                      box={it.box}
                      paredes={paredes}
                      catalogo={catalogo}
                      onAtualizar={(patch) => atualizarBoxCampo(id, patch)}
                    />
                  )}
                  <div className="acoes" style={{ marginTop: 8 }}>
                    <button onClick={() => duplicar(id)}>Duplicar</button>
                    <button className="danger" onClick={() => excluir(id)}>
                      Excluir
                    </button>
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
                  style={financeiro.abaixoDaMargemMinima ? { borderColor: "var(--red)" } : {}}
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
              <button
                className="primary"
                style={{ marginTop: 12, width: "100%" }}
                onClick={() => gerarProposta(financeiro)}
              >
                Gerar proposta (PDF)
              </button>
            </div>
          )}

          {/* V2-5 — Pré-orçamento de insumos unificado (BOM + custo) */}
          {engine && insumos && (
            <div className="card">
              <h2>Pré-orçamento de insumos</h2>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Categoria</th>
                    <th>Qtd</th>
                    <th className="num">Custo unit.</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {insumos.linhas.map((l, i) => (
                    <tr key={i}>
                      <td>{l.item}</td>
                      <td className="muted">{l.categoria}</td>
                      <td>{l.qtd}</td>
                      <td className="num">{brl(l.unit)}</td>
                      <td className="num">{brl(l.total)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4}>
                      <strong>Subtotal (custo direto)</strong>
                    </td>
                    <td className="num">
                      <strong>{brl(insumos.subtotal)}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>

              {engine.globais.length > 0 && (
                <table style={{ marginTop: 12 }}>
                  <thead>
                    <tr>
                      <th>Elemento contínuo</th>
                      <th className="num">Comp. (m)</th>
                      <th className="num">Cobre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engine.globais.map((g, i) => (
                      <tr key={i}>
                        <td>
                          {g.tipo === "tampo" ? "Tampo" : "Rodapé"} · parede {g.parede}
                        </td>
                        <td className="num">{(g.comprimento_mm / 1000).toFixed(2)}</td>
                        <td className="num">{g.modulos} mód.</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

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
        Documentação em <code>/docs</code>. Configure materiais e a engenharia dos
        módulos no menu acima. Preços do catálogo salvos no navegador (V2-6).
      </div>
    </div>
  );
}

// Card de edição de um módulo de TEMPLATE (motor paramétrico clássico).
function TemplateModuloCard({
  modulo,
  templates,
  paredes,
  catalogo,
  onAtualizar,
  onAtualizarConfig,
  onAtualizarMaterial,
}: {
  modulo: ModuloInstanciado;
  templates: TemplateMeta[];
  paredes: Record<string, number>;
  catalogo: Catalogo | null;
  onAtualizar: (patch: Partial<ModuloInstanciado>) => void;
  onAtualizarConfig: (chave: string, valor: number) => void;
  onAtualizarMaterial: (cm: ConfiguracaoMaterialModulo | undefined) => void;
}) {
  const meta = templates.find((t) => t.codigo === modulo.templateCodigo);
  return (
    <>
      <div style={{ display: "flex", gap: 12 }}>
        <ModulePreview
          modulo={{
            largura_mm: modulo.largura_mm,
            altura_mm: modulo.altura_mm,
            config: modulo.config ?? {},
            corExterno: modulo.configMaterial?.externo.acabamento,
          }}
        />
        <div style={{ flex: 1 }}>
          <div className="linha">
            <select
              className="nome"
              value={modulo.templateCodigo}
              onChange={(e) => {
                const t = templates.find((x) => x.codigo === e.target.value);
                onAtualizar({
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
              value={modulo.parede ?? "A"}
              onChange={(e) => onAtualizar({ parede: e.target.value })}
              style={{ width: 60 }}
            >
              {Object.keys(paredes).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="campos" style={{ marginTop: 8 }}>
            <div>
              <label>Largura</label>
              <input
                type="number"
                value={modulo.largura_mm}
                onChange={(e) => onAtualizar({ largura_mm: Number(e.target.value) })}
              />
            </div>
            <div>
              <label>Altura</label>
              <input
                type="number"
                value={modulo.altura_mm}
                onChange={(e) => onAtualizar({ altura_mm: Number(e.target.value) })}
              />
            </div>
            <div>
              <label>Prof.</label>
              <input
                type="number"
                value={modulo.profundidade_mm}
                onChange={(e) => onAtualizar({ profundidade_mm: Number(e.target.value) })}
              />
            </div>
            {Object.keys(meta?.config_padrao ?? modulo.config ?? {}).map((chave) => (
              <div key={chave}>
                <label>{chave.replace("CONFIG_QTD_", "").replace("CONFIG_", "")}</label>
                <input
                  type="number"
                  value={modulo.config?.[chave] ?? 0}
                  onChange={(e) => onAtualizarConfig(chave, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <MaterialModulo
        catalogo={catalogo}
        valor={modulo.configMaterial}
        onChange={onAtualizarMaterial}
      />
    </>
  );
}

// Card de edição de um módulo-CAIXA (V3): apenas overrides comerciais — a
// engenharia (subdivisões/conteúdo) é definida no laboratório (/modulo).
function BoxModuloCard({
  box,
  paredes,
  catalogo,
  onAtualizar,
}: {
  box: BoxModule;
  paredes: Record<string, number>;
  catalogo: Catalogo | null;
  onAtualizar: (patch: Partial<BoxModule>) => void;
}) {
  const cores = catalogo ? coresDisponiveis(catalogo) : [box.caixa.cor];
  return (
    <>
      <div className="linha">
        <span className="nome">
          {box.nome}{" "}
          <span className="muted" style={{ fontSize: 12 }}>
            ({box.tipo})
          </span>
        </span>
        <select
          value={box.parede ?? "A"}
          onChange={(e) => onAtualizar({ parede: e.target.value })}
          style={{ width: 60 }}
        >
          {Object.keys(paredes).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div className="campos" style={{ marginTop: 8 }}>
        <div>
          <label>Largura</label>
          <input
            type="number"
            value={box.largura}
            onChange={(e) => onAtualizar({ largura: Number(e.target.value) })}
          />
        </div>
        <div>
          <label>Altura</label>
          <input
            type="number"
            value={box.altura}
            onChange={(e) => onAtualizar({ altura: Number(e.target.value) })}
          />
        </div>
        <div>
          <label>Prof.</label>
          <input
            type="number"
            value={box.profundidade}
            onChange={(e) => onAtualizar({ profundidade: Number(e.target.value) })}
          />
        </div>
        <div>
          <label>Cor caixa</label>
          <select
            value={box.caixa.cor}
            onChange={(e) => onAtualizar({ caixa: { ...box.caixa, cor: e.target.value } })}
          >
            {cores.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Esp. caixa</label>
          <select
            value={box.caixa.espessura}
            onChange={(e) =>
              onAtualizar({ caixa: { ...box.caixa, espessura: Number(e.target.value) } })
            }
          >
            {[15, 18].map((esp) => (
              <option key={esp} value={esp}>
                {esp} mm
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        Engenharia definida no editor. Edite a estrutura em <a href="/modulo">/modulo</a>.
      </div>
    </>
  );
}

// V2-1 — Editor de material por módulo (interno/externo/portas + tem fundo).
function MaterialModulo({
  catalogo,
  valor,
  onChange,
}: {
  catalogo: Catalogo | null;
  valor?: ConfiguracaoMaterialModulo;
  onChange: (cm: ConfiguracaoMaterialModulo | undefined) => void;
}) {
  const cores = catalogo ? coresDisponiveis(catalogo) : ["Branco TX", "Louro Freijó"];

  if (!valor) {
    return (
      <button
        style={{ marginTop: 8 }}
        onClick={() => onChange(materialInicial(cores))}
      >
        + Personalizar material
      </button>
    );
  }

  const slot = (
    nome: "interno" | "externo" | "portas",
    rot: string
  ) => {
    const s = valor[nome];
    const espessuras = catalogo ? espessurasDaCor(catalogo, s.acabamento) : [15, 18];
    return (
      <div>
        <label>{rot}</label>
        <select
          value={s.acabamento}
          onChange={(e) =>
            onChange({ ...valor, [nome]: { ...s, acabamento: e.target.value } })
          }
        >
          {cores.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={s.espessura}
          style={{ marginTop: 4 }}
          onChange={(e) =>
            onChange({ ...valor, [nome]: { ...s, espessura: Number(e.target.value) } })
          }
        >
          {(espessuras.length ? espessuras : [15, 18]).map((esp) => (
            <option key={esp} value={esp}>
              {esp} mm
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
      <div className="campos">
        {slot("interno", "Interno")}
        {slot("externo", "Externo")}
        {slot("portas", "Portas")}
        <div>
          <label>Tem fundo</label>
          <select
            value={valor.temFundo ? "sim" : "nao"}
            onChange={(e) => onChange({ ...valor, temFundo: e.target.value === "sim" })}
          >
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
      </div>
      <button className="ghost" style={{ marginTop: 6 }} onClick={() => onChange(undefined)}>
        Usar padrão do ambiente
      </button>
    </div>
  );
}

function materialInicial(cores: string[]): ConfiguracaoMaterialModulo {
  const branco = cores.find((c) => c.toLowerCase().includes("branco")) ?? cores[0];
  const frente = cores.find((c) => c !== branco) ?? branco;
  return {
    interno: { espessura: 15, acabamento: branco },
    externo: { espessura: 18, acabamento: branco },
    portas: { espessura: 18, acabamento: frente },
    temFundo: true,
  };
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
