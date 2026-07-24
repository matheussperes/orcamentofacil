"use client";

import { useEffect, useMemo, useState } from "react";
import { calcularPreco, type ParametrosComerciais } from "@/lib/engine/pricing";
import {
  COMERCIAL_PADRAO,
  MATERIAIS_PADRAO,
  PARAMETROS_FABRICA_PADRAO,
} from "@/lib/engine/defaults";
import type { EngineOutput } from "@/lib/engine/types";
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
import { montarLinhasInsumos, todasAsPecas } from "@/lib/insumos";
import { planoDeCorte } from "@/lib/engine/box/cutting";
import { BoxCanvas } from "./components/BoxCanvas";
import { PlanoCorteCanvas } from "./components/PlanoCorteCanvas";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/ui/stepper";
import { cn } from "@/lib/utils";
import { LayoutVisualizer, type LayoutModulo } from "./components/LayoutVisualizer";

const PAREDES_PADRAO: Record<string, number> = { A: 3200, B: 2100 };

let seq = 1;
const novoId = () => `m${seq++}`;

/** Cópia editável de um item (novo id). */
function clonarItem(it: ModuloOrcamento): ModuloOrcamento {
  const box: BoxModule = JSON.parse(JSON.stringify(it.box));
  box.id = novoId();
  return { origem: "custom_box", box };
}

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

export default function Home() {
  // Lista única de itens de orçamento (hoje só caixas customizadas V3; a
  // Task 12.1 adiciona o branch "placa"). Sem estado paralelo.
  const [itens, setItens] = useState<ModuloOrcamento[]>([]);
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
    setCatalogo(carregarCatalogo());
    seedPresetsPadrao();
    setPresets(listarPresets());
  }, []);

  const precos = useMemo(
    () => (catalogo ? catalogoParaPrecos(catalogo) : undefined),
    [catalogo]
  );

  // Cálculo no cliente: a lista única de caixas — o orquestrador consolida
  // numa única saída (MDF, fita, ferragens).
  function calcular() {
    setCarregando(true);
    setErro(null);
    try {
      const t0 = performance.now();
      const result = calcularOrcamentoMisto({
        ambiente: { tipo: "Cozinha", materiais: MATERIAIS_PADRAO },
        parametros: PARAMETROS_FABRICA_PADRAO,
        itens,
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
        categoria: it.box.tipo === "aereo" ? "superior" : "inferior",
        cor: corExternaDoItem(it),
      })),
    [itens]
  );

  return (
    <div className="wrap">
      <header className="mb-6">
        <h1 className="text-display font-bold text-cinza-900">Budget Planner AI</h1>
        <p className="mt-1 text-corpo text-cinza-500">
          Motor paramétrico de orçamento — do módulo ao preço em segundos.
        </p>
        <nav className="mt-4 flex flex-wrap items-center gap-4 text-corpo">
          <a href="/modulo" className="text-accent hover:text-accent-hover hover:underline">
            Editor de módulo (V3)
          </a>
          <a
            href="/biblioteca"
            className="text-accent hover:text-accent-hover hover:underline"
          >
            Biblioteca de módulos
          </a>
          <a
            href="/configuracoes/materiais"
            className="text-accent hover:text-accent-hover hover:underline"
          >
            Materiais
          </a>
        </nav>
      </header>

      <div className="mb-4 flex flex-wrap gap-3">
        <Button variant="primary" onClick={calcular} disabled={carregando}>
          {carregando ? "Calculando…" : "Criar orçamento"}
        </Button>
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
                <div
                  className={
                    min
                      ? "mb-2 cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:border-accent-border hover:bg-cinza-100"
                      : "mb-2 rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs"
                  }
                  key={id}
                  onClick={min ? () => expandir(id) : undefined}
                >
                  {min ? (
                    <ResumoModulo it={it} />
                  ) : (
                    <BoxModuloCard
                      box={it.box}
                      paredes={paredes}
                      catalogo={catalogo}
                      onAtualizar={(patch) => atualizarBoxCampo(id, patch)}
                    />
                  )}
                  <div
                    className="mt-2 flex flex-wrap justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {min ? (
                      <Button variant="primary" size="sm" onClick={() => expandir(id)}>
                        Editar
                      </Button>
                    ) : (
                      <Button variant="primary" size="sm" onClick={() => minimizar(id)}>
                        Salvar
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => duplicar(id)}>
                      Duplicar
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => excluir(id)}>
                      Excluir
                    </Button>
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
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-accent-border bg-accent-subtle p-3">
                  <div className="text-legenda text-cinza-500">Preço final</div>
                  <div className="text-valor-destaque text-accent tabular-nums">
                    {brl(financeiro.precoComDesconto)}
                  </div>
                </div>
                <div className="rounded-lg border border-cinza-200 bg-cinza-0 p-3">
                  <div className="text-legenda text-cinza-500">Custo direto</div>
                  <div className="text-valor-destaque text-cinza-900 tabular-nums">
                    {brl(financeiro.custoDireto)}
                  </div>
                </div>
                <div className="rounded-lg border border-cinza-200 bg-cinza-0 p-3">
                  <div className="text-legenda text-cinza-500">Lucro bruto</div>
                  <div className="text-valor-destaque text-cinza-900 tabular-nums">
                    {brl(financeiro.lucroBruto)}
                  </div>
                </div>
                <div
                  className={cn(
                    "rounded-lg border bg-cinza-0 p-3",
                    financeiro.abaixoDaMargemMinima ? "border-erro" : "border-cinza-200"
                  )}
                >
                  <div className="text-legenda text-cinza-500">Margem efetiva</div>
                  <div className="text-valor-destaque text-cinza-900 tabular-nums">
                    {pct(financeiro.margemEfetiva)}
                  </div>
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
              <Button
                variant="primary"
                className="mt-3 w-full"
                onClick={() => gerarProposta(financeiro)}
              >
                Gerar proposta (PDF)
              </Button>
            </div>
          )}

          {/* V2-5 — Pré-orçamento de insumos unificado (BOM + custo) */}
          {engine && insumos && (
            <div className="card">
              <h2>Pré-orçamento de insumos</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-cinza-200 bg-cinza-50">
                      <th className="px-[10px] py-2 text-left text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                        Item
                      </th>
                      <th className="px-[10px] py-2 text-left text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                        Categoria
                      </th>
                      <th className="px-[10px] py-2 text-left text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                        Qtd
                      </th>
                      <th className="px-[10px] py-2 text-right text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                        Custo unit.
                      </th>
                      <th className="px-[10px] py-2 text-right text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumos.linhas.map((l, i) => (
                      <tr key={i} className="border-b border-cinza-100 hover:bg-cinza-50">
                        <td className="px-[10px] py-2 text-corpo-pequeno">{l.item}</td>
                        <td className="px-[10px] py-2 text-corpo-pequeno text-cinza-500">
                          {l.categoria}
                        </td>
                        <td className="px-[10px] py-2 text-corpo-pequeno">{l.qtd}</td>
                        <td className="px-[10px] py-2 text-right text-corpo-pequeno tabular-nums">
                          {brl(l.unit)}
                        </td>
                        <td className="px-[10px] py-2 text-right text-corpo-pequeno tabular-nums">
                          {brl(l.total)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-cinza-300 bg-cinza-50 font-bold">
                      <td className="px-[10px] py-2 text-corpo-pequeno" colSpan={4}>
                        Subtotal (custo direto)
                      </td>
                      <td className="px-[10px] py-2 text-right text-corpo-pequeno tabular-nums">
                        {brl(insumos.subtotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {engine.globais.length > 0 && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-cinza-200 bg-cinza-50">
                        <th className="px-[10px] py-2 text-left text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                          Elemento contínuo
                        </th>
                        <th className="px-[10px] py-2 text-right text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                          Comp. (m)
                        </th>
                        <th className="px-[10px] py-2 text-right text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                          Cobre
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {engine.globais.map((g, i) => (
                        <tr key={i} className="border-b border-cinza-100 hover:bg-cinza-50">
                          <td className="px-[10px] py-2 text-corpo-pequeno">
                            {g.tipo === "tampo" ? "Tampo" : "Rodapé"} · parede {g.parede}
                          </td>
                          <td className="px-[10px] py-2 text-right text-corpo-pequeno tabular-nums">
                            {(g.comprimento_mm / 1000).toFixed(2)}
                          </td>
                          <td className="px-[10px] py-2 text-right text-corpo-pequeno tabular-nums">
                            {g.modulos} mód.
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
function ResumoModulo({ it }: { it: ModuloOrcamento }) {
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
      <Stepper
        steps={["Ambiente", "Tipo", "Modelo"]}
        currentStep={!ambiente ? 0 : !tipo ? 1 : 2}
        className="mt-2"
      />
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
      <div className="flex flex-wrap gap-3 sm:flex-nowrap">
        <div className="w-[180px] shrink-0">
          <BoxCanvas box={box} comercial />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 text-titulo-card font-semibold">
              {box.nome}{" "}
              <span className="muted text-legenda">
                ({box.tipo})
              </span>
            </span>
            <select
              className="w-16"
              value={box.parede ?? "A"}
              onChange={(e) => onAtualizar({ parede: e.target.value })}
            >
              {Object.keys(paredes).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            <div className="min-w-0">
              <label>Largura</label>
              <input
                type="number"
                value={box.largura}
                onChange={(e) => onAtualizar({ largura: Number(e.target.value) })}
              />
            </div>
            <div className="min-w-0">
              <label>Altura</label>
              <input
                type="number"
                value={box.altura}
                onChange={(e) => onAtualizar({ altura: Number(e.target.value) })}
              />
            </div>
            <div className="min-w-0">
              <label>Prof.</label>
              <input
                type="number"
                value={box.profundidade}
                onChange={(e) => onAtualizar({ profundidade: Number(e.target.value) })}
              />
            </div>
            <div className="min-w-0">
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
            <div className="min-w-0">
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
            <div className="muted mt-1.5 text-legenda">
              Largura de instalação: {larguraInstalacao}mm (carcaça {box.largura}mm +
              tamponamento)
            </div>
          )}
        </div>
      </div>

      {/* Outras configurações: overrides rápidos de instância (portas e fundo),
          sem reabrir o editor — agrupados atrás de um único botão colapsável. */}
      <div className="mt-2.5 border-t border-cinza-200 pt-2">
        {!outrasAbertas ? (
          <Button variant="ghost" size="sm" onClick={() => setOutrasAbertas(true)}>
            Outras configurações
          </Button>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => setOutrasAbertas(false)}>
              Fechar outras configurações
            </Button>

            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
              <div className="min-w-0">
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
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => onAtualizar({ overridePortas: { cor: cores[0] ?? box.caixa.cor, espessura: 18 } })}
              >
                + Personalizar cor das portas
              </Button>
            ) : (
              <div className="mt-2">
                <label>Cor/espessura das portas (todas)</label>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="min-w-0">
                    <select
                      value={box.overridePortas.cor}
                      onChange={(e) => onAtualizar({ overridePortas: { ...box.overridePortas!, cor: e.target.value } })}
                    >
                      {cores.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="min-w-0">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1"
                  onClick={() => onAtualizar({ overridePortas: undefined })}
                >
                  Usar cor do gabarito
                </Button>
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

      <div className="muted mt-1.5 text-legenda">
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
      <Button variant="ghost" size="sm" className="mt-2" onClick={() => onChange(tamponamentoInicial(cores))}>
        + Adicionar tamponamento
      </Button>
    );
  }

  function setLado(lado: LadoTampNome, patch: Partial<TamponamentoLado>) {
    onChange({ ...valor!, [lado]: { ...valor![lado], ...patch } });
  }

  return (
    <div className="mt-2.5 border-t border-cinza-200 pt-2">
      <label>Tamponamento (por lado)</label>
      {LADOS_TAMPONAMENTO.map((lado) => {
        const cfg = valor[lado];
        const espessuras = catalogo ? espessurasDaCor(catalogo, cfg.material.cor) : [15, 18, 25];
        return (
          <div key={lado} className="mt-2 border-t border-dashed border-cinza-200 pt-1.5">
            <label className="flex items-center gap-1.5 text-corpo-pequeno">
              <input
                type="checkbox"
                checked={cfg.ativo}
                onChange={(e) => setLado(lado, { ativo: e.target.checked })}
              />
              {ROTULO_LADO[lado]}
            </label>
            {cfg.ativo && (
              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="min-w-0">
                  <label>Cor</label>
                  <select value={cfg.material.cor} onChange={(e) => setLado(lado, { material: { ...cfg.material, cor: e.target.value } })}>
                    {cores.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="min-w-0">
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
                <div className="min-w-0">
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
      <Button variant="ghost" size="sm" className="mt-2" onClick={() => onChange(undefined)}>
        Remover tamponamento
      </Button>
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
  // Progresso do trilho preenchido (Design-System.md Seção 0/6 — trilho/thumb
  // em `--accent`). Tailwind não estiliza os pseudo-elementos nativos de
  // `input[type=range]` (::-webkit-slider-thumb/::-moz-range-thumb) sem
  // plugin, então o preenchimento visual usa a variável CSS `--range-progress`
  // consumida pelas regras em `app/globals.css` (`.slider-row input[type="range"]`).
  const progresso = max > min ? ((valor - min) / (max - min)) * 100 : 0;
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
        style={{ "--range-progress": `${progresso}%` } as React.CSSProperties}
      />
      <span className="v">{(valor * 100).toFixed(0)}%</span>
    </div>
  );
}
