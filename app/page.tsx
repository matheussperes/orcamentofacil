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
import {
  larguraInstalacaoBox,
  type BoxModule,
  type TamponamentoInstancia,
  type TamponamentoLado,
} from "@/lib/engine/box/types";
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
import { listarPresets, seedPresetsPadrao, type BoxPreset } from "@/lib/boxPresets";
import {
  carregarCatalogo,
  catalogoParaPrecos,
  coresDisponiveis,
  espessurasDaCor,
  type Catalogo,
} from "@/lib/catalog";
import { carregarOverrides } from "@/lib/templateOverrides";
import { montarLinhasInsumos, todasAsPecas } from "@/lib/insumos";
import { planoDeCorte } from "@/lib/engine/box/cutting";
import { ModulePreview } from "./components/ModulePreview";
import { BoxCanvas } from "./components/BoxCanvas";
import { PlanoCorteCanvas } from "./components/PlanoCorteCanvas";
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

  // Assistente "+ Novo módulo": Ambiente → Tipo → Modelo, lido a partir dos
  // presets salvos no editor (o editor é a fonte da verdade).
  const [wizardAberto, setWizardAberto] = useState(false);
  const [wizAmbiente, setWizAmbiente] = useState("");
  const [wizTipo, setWizTipo] = useState("");

  // Cards "salvos" ficam colapsados numa vista-resumo (com botão Editar).
  const [minimizados, setMinimizados] = useState<Set<string>>(new Set());

  const [comercial, setComercial] = useState<ParametrosComerciais>(COMERCIAL_PADRAO);

  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates))
      .catch(() => {});
    setCatalogo(carregarCatalogo());
    seedPresetsPadrao();
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

  // Plano de corte considerando TODOS os módulos do orçamento (não só um).
  const planoGeral = useMemo(
    () => (engine ? planoDeCorte(todasAsPecas(engine)) : []),
    [engine]
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
    setMinimizados((s) => {
      const novo = new Set(s);
      novo.delete(id);
      return novo;
    });
  }
  function minimizar(id: string) {
    setMinimizados((s) => new Set(s).add(id));
  }
  function expandir(id: string) {
    setMinimizados((s) => {
      const novo = new Set(s);
      novo.delete(id);
      return novo;
    });
  }
  // Instancia um preset do editor de caixa (V3) como cópia editável.
  function adicionarBox(p: BoxPreset) {
    const clone: BoxModule = JSON.parse(JSON.stringify(p.box));
    clone.id = novoId();
    clone.parede = clone.parede ?? "A";
    clone.categoria = p.categoria; // carrega p/ o resumo do card colapsado
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
          <a href="/biblioteca">Biblioteca de módulos</a> ·{" "}
          <a href="/configuracoes/materiais">Materiais</a> ·{" "}
          <a href="/configuracoes/engenharia">Engenharia</a>
        </p>
      </header>

      <div className="toolbar">
        <button className="primary" onClick={calcular} disabled={carregando}>
          {carregando ? "Calculando…" : "Criar orçamento"}
        </button>
        <button className="ghost" onClick={() => setItens(PRESET_COZINHA.map(clonarItem))}>
          Recarregar preset "Cozinha em L" (demo legado)
        </button>
      </div>

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

            {!wizardAberto && (
              <button
                className="primary"
                style={{ marginBottom: 12 }}
                onClick={() => {
                  setWizAmbiente("");
                  setWizTipo("");
                  setWizardAberto(true);
                }}
              >
                + Novo módulo
              </button>
            )}

            {wizardAberto && (
              <NovoModuloWizard
                presets={presets}
                ambiente={wizAmbiente}
                tipo={wizTipo}
                onAmbiente={(a) => {
                  setWizAmbiente(a);
                  setWizTipo("");
                }}
                onTipo={setWizTipo}
                onEscolher={(p) => {
                  adicionarBox(p);
                  setWizardAberto(false);
                }}
                onCancelar={() => setWizardAberto(false)}
              />
            )}

            {itens.map((it) => {
              const id = idDoItem(it);
              const min = minimizados.has(id);
              return (
                <div className="modulo" key={id}>
                  {min ? (
                    <ResumoModulo it={it} templates={templates} />
                  ) : it.origem === "template" ? (
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
                    {min ? (
                      <button className="primary" onClick={() => expandir(id)}>
                        Editar
                      </button>
                    ) : (
                      <button className="primary" onClick={() => minimizar(id)}>
                        Salvar
                      </button>
                    )}
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

          {/* Plano de corte de TODOS os módulos do orçamento */}
          {engine && planoGeral.length > 0 && (
            <div className="card">
              <h2>Plano de corte (orçamento completo)</h2>
              <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
                Todas as peças de todos os módulos, agrupadas por material.
                Empacotamento heurístico — apenas para validação visual.
              </p>
              {planoGeral.map((g) => (
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

// Vista resumida de um módulo "salvo" (colapsado): preview + dados essenciais.
function ResumoModulo({
  it,
  templates,
}: {
  it: ModuloOrcamento;
  templates: TemplateMeta[];
}) {
  if (it.origem === "template") {
    const m = it.modulo;
    const meta = templates.find((t) => t.codigo === m.templateCodigo);
    return (
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <ModulePreview
          modulo={{
            largura_mm: m.largura_mm,
            altura_mm: m.altura_mm,
            config: m.config ?? {},
            corExterno: m.configMaterial?.externo.acabamento,
          }}
        />
        <div style={{ fontSize: 13, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 600 }}>{meta?.nome ?? m.templateCodigo}</div>
          <div className="muted">
            Parede {m.parede ?? "A"} · {m.largura_mm}×{m.altura_mm}×{m.profundidade_mm}mm
          </div>
          <div className="muted">
            Cor: {m.configMaterial?.externo.acabamento ?? "padrão do ambiente"}
          </div>
        </div>
      </div>
    );
  }

  const box = it.box;
  const coresTamponamento = [
    box.tamponamento?.esquerdo,
    box.tamponamento?.direito,
    box.tamponamento?.superior,
    box.tamponamento?.inferior,
  ]
    .filter((l) => l?.ativo)
    .map((l) => l!.material.cor);

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 96, flexShrink: 0 }}>
        <BoxCanvas box={box} comercial />
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>
        <div style={{ fontWeight: 600 }}>
          {box.nome}
          {box.categoria && (
            <span className="muted" style={{ fontWeight: 400 }}> · {box.categoria}</span>
          )}
        </div>
        <div className="muted">
          Parede {box.parede ?? "A"} · {box.largura}×{box.altura}×{box.profundidade}mm
        </div>
        <div className="muted">
          Interno: {box.caixa.cor} · Tamponamento:{" "}
          {coresTamponamento.length ? [...new Set(coresTamponamento)].join(", ") : "—"}
        </div>
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

// Assistente "+ Novo módulo": Ambiente → Tipo → Modelo, lido a partir dos
// presets salvos no editor (/modulo é a fonte da verdade — doc 12/Etapa 2-3).
function NovoModuloWizard({
  presets,
  ambiente,
  tipo,
  onAmbiente,
  onTipo,
  onEscolher,
  onCancelar,
}: {
  presets: BoxPreset[];
  ambiente: string;
  tipo: string;
  onAmbiente: (a: string) => void;
  onTipo: (t: string) => void;
  onEscolher: (p: BoxPreset) => void;
  onCancelar: () => void;
}) {
  if (presets.length === 0) {
    return (
      <div className="modulo" style={{ borderColor: "var(--accent)" }}>
        <p className="muted">
          Nenhum módulo cadastrado ainda. Monte um no{" "}
          <a href="/modulo">editor de caixa</a> e salve como preset — ele
          aparecerá aqui para adicionar ao orçamento.
        </p>
        <button onClick={onCancelar}>Cancelar</button>
      </div>
    );
  }

  const rotuloTipo: Record<string, string> = {
    aereo: "Aéreo",
    inferior: "Inferior",
    torre: "Torre",
  };
  const ambientes = [...new Set(presets.map((p) => p.categoria))].sort();
  const tipos = ambiente
    ? [...new Set(presets.filter((p) => p.categoria === ambiente).map((p) => p.box.tipo))]
    : [];
  const modelos =
    ambiente && tipo
      ? presets.filter((p) => p.categoria === ambiente && p.box.tipo === tipo)
      : [];

  return (
    <div className="modulo" style={{ borderColor: "var(--accent)" }}>
      <div className="linha">
        <strong className="nome">Novo módulo</strong>
        <button className="ghost" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
      <div className="campos" style={{ marginTop: 8 }}>
        <div>
          <label>1. Ambiente</label>
          <select value={ambiente} onChange={(e) => onAmbiente(e.target.value)}>
            <option value="" disabled>
              Selecione…
            </option>
            {ambientes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        {ambiente && (
          <div>
            <label>2. Tipo</label>
            <select value={tipo} onChange={(e) => onTipo(e.target.value)}>
              <option value="" disabled>
                Selecione…
              </option>
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {rotuloTipo[t] ?? t}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {ambiente && tipo && (
        <div style={{ marginTop: 10 }}>
          <label>3. Modelo</label>
          <div className="toolbar" style={{ marginTop: 4 }}>
            {modelos.map((p) => (
              <button key={p.id} onClick={() => onEscolher(p)}>
                {p.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Card de edição de um módulo-CAIXA (V3): overrides comerciais de instância
// (dimensões, cor/espessura interna, tamponamento) — a engenharia interna
// (subdivisões/conteúdo dos vãos) é definida no laboratório (/modulo).
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
  const larguraInstalacao = larguraInstalacaoBox(box);
  const [outrasAbertas, setOutrasAbertas] = useState(false);

  return (
    <>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 180, flexShrink: 0 }}>
          <BoxCanvas box={box} comercial />
        </div>
        <div style={{ flex: 1 }}>
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
              <label>Cor interno</label>
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
              <label>Esp. interno</label>
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
          {larguraInstalacao !== box.largura && (
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Largura de instalação: {larguraInstalacao}mm (carcaça {box.largura}mm +
              tamponamento)
            </div>
          )}
        </div>
      </div>

      {/* Outras configurações: overrides rápidos de instância (portas e fundo),
          sem reabrir o editor — agrupados atrás de um único botão colapsável. */}
      <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
        {!outrasAbertas ? (
          <button style={{ marginTop: 0 }} onClick={() => setOutrasAbertas(true)}>
            Outras configurações
          </button>
        ) : (
          <>
            <button className="ghost" onClick={() => setOutrasAbertas(false)}>
              Fechar outras configurações
            </button>

            <div className="campos" style={{ marginTop: 8 }}>
              <div>
                <label>Tem fundo</label>
                <select
                  value={box.temFundo ? "sim" : "nao"}
                  onChange={(e) => onAtualizar({ temFundo: e.target.value === "sim" })}
                >
                  <option value="sim">Sim (todos os vãos)</option>
                  <option value="nao">Não (nenhum vão)</option>
                </select>
              </div>
            </div>

            {!box.overridePortas ? (
              <button
                style={{ marginTop: 8 }}
                onClick={() => onAtualizar({ overridePortas: { cor: cores[0] ?? box.caixa.cor, espessura: 18 } })}
              >
                + Personalizar cor das portas
              </button>
            ) : (
              <div style={{ marginTop: 8 }}>
                <label>Cor/espessura das portas (todas)</label>
                <div className="campos" style={{ marginTop: 4 }}>
                  <div>
                    <select
                      value={box.overridePortas.cor}
                      onChange={(e) => onAtualizar({ overridePortas: { ...box.overridePortas!, cor: e.target.value } })}
                    >
                      {cores.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <select
                      value={box.overridePortas.espessura}
                      onChange={(e) => onAtualizar({ overridePortas: { ...box.overridePortas!, espessura: Number(e.target.value) } })}
                    >
                      {(catalogo ? espessurasDaCor(catalogo, box.overridePortas.cor) : [15, 18]).map((esp) => (
                        <option key={esp} value={esp}>{esp} mm</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button className="ghost" style={{ marginTop: 4 }} onClick={() => onAtualizar({ overridePortas: undefined })}>
                  Usar cor do gabarito
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <TamponamentoConfig
        catalogo={catalogo}
        valor={box.tamponamento}
        onChange={(t) => onAtualizar({ tamponamento: t })}
      />

      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        Estrutura interna (vãos, prateleiras) definida no editor.{" "}
        <a href="/modulo">Editar em /modulo</a>.
      </div>
    </>
  );
}

const LADOS_TAMPONAMENTO = ["esquerdo", "direito", "superior", "inferior"] as const;
type LadoTampNome = (typeof LADOS_TAMPONAMENTO)[number];
const ROTULO_LADO: Record<LadoTampNome, string> = {
  esquerdo: "Esquerdo",
  direito: "Direito",
  superior: "Superior (topo)",
  inferior: "Inferior (base)",
};

// Tamponamento de instância (doc 12): soma à largura de instalação, não altera
// a carcaça já pronta. Cada lado tem sua PRÓPRIA montagem (inteiriça/sarrafo)
// e material — ligar o direito não obriga o topo a usar a mesma cor.
function TamponamentoConfig({
  catalogo,
  valor,
  onChange,
}: {
  catalogo: Catalogo | null;
  valor?: TamponamentoInstancia;
  onChange: (t: TamponamentoInstancia | undefined) => void;
}) {
  const cores = catalogo ? coresDisponiveis(catalogo) : ["Branco TX", "Madeirado"];

  if (!valor) {
    return (
      <button style={{ marginTop: 8 }} onClick={() => onChange(tamponamentoInicial(cores))}>
        + Adicionar tamponamento
      </button>
    );
  }

  function setLado(lado: LadoTampNome, patch: Partial<TamponamentoLado>) {
    onChange({ ...valor!, [lado]: { ...valor![lado], ...patch } });
  }

  return (
    <div style={{ marginTop: 10, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
      <label>Tamponamento (por lado)</label>
      {LADOS_TAMPONAMENTO.map((lado) => {
        const cfg = valor[lado];
        const espessuras = catalogo ? espessurasDaCor(catalogo, cfg.material.cor) : [15, 18, 25];
        return (
          <div key={lado} style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed var(--border)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={cfg.ativo}
                onChange={(e) => setLado(lado, { ativo: e.target.checked })}
              />
              {ROTULO_LADO[lado]}
            </label>
            {cfg.ativo && (
              <div className="campos" style={{ marginTop: 4 }}>
                <div>
                  <label>Cor</label>
                  <select value={cfg.material.cor} onChange={(e) => setLado(lado, { material: { ...cfg.material, cor: e.target.value } })}>
                    {cores.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label>Espessura</label>
                  <select
                    value={cfg.material.espessura}
                    onChange={(e) => setLado(lado, { material: { ...cfg.material, espessura: Number(e.target.value) } })}
                  >
                    {(espessuras.length ? espessuras : [15, 18, 25]).map((esp) => (
                      <option key={esp} value={esp}>{esp} mm</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Montagem</label>
                  <select value={cfg.sarrafo ? "sarrafo" : "inteirica"} onChange={(e) => setLado(lado, { sarrafo: e.target.value === "sarrafo" })}>
                    <option value="inteirica">Inteiriça</option>
                    <option value="sarrafo">Sarrafo</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button className="ghost" style={{ marginTop: 8 }} onClick={() => onChange(undefined)}>
        Remover tamponamento
      </button>
    </div>
  );
}

function tamponamentoInicial(cores: string[]): TamponamentoInstancia {
  const ladoBase = (): TamponamentoLado => ({
    ativo: false,
    sarrafo: false,
    material: { cor: cores[0] ?? "Branco TX", espessura: 18 },
  });
  return {
    esquerdo: ladoBase(),
    direito: ladoBase(),
    superior: ladoBase(),
    inferior: ladoBase(),
  };
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
