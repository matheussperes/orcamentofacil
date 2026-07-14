"use client";

import { useMemo, useState } from "react";
import { listarTemplates } from "@/lib/engine/templates";
import { evalFormula, variaveisDaFormula } from "@/lib/engine/evaluator";
import {
  carregarOverrides,
  removerOverride,
  salvarOverride,
} from "@/lib/templateOverrides";
import { PARAMETROS_FABRICA_PADRAO } from "@/lib/engine/defaults";
import type { Componente, ModuloTemplate } from "@/lib/engine/types";

// V2-4 — Configurador de engenharia dos módulos. Edita as fórmulas de montagem
// (o que cada medida representa e como o módulo vira peças de MDF), valida ao
// vivo com o mesmo avaliador do motor e salva como override. É a semente da
// "Engine Configurável" (doc 08) sem tocar no código do motor.

function clonar<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

// Escopo de teste para validar fórmulas ao vivo.
function escopoTeste(t: ModuloTemplate): Record<string, number> {
  const s: Record<string, number> = {
    MEDIDA_LARGURA: 600,
    MEDIDA_ALTURA: 720,
    MEDIDA_PROFUNDIDADE: 550,
  };
  for (const [k, v] of Object.entries(t.config_padrao)) s[k] = v;
  for (const [k, v] of Object.entries(PARAMETROS_FABRICA_PADRAO)) {
    if (k !== "perda_mdf") s[`PARAM_${k}`] = v as number;
  }
  return s;
}

function avaliar(expr: string, scope: Record<string, number>): {
  ok: boolean;
  texto: string;
} {
  try {
    const faltando = variaveisDaFormula(expr).filter((v) => !(v in scope));
    if (faltando.length) return { ok: false, texto: `var. inválida: ${faltando.join(", ")}` };
    return { ok: true, texto: `= ${round(evalFormula(expr, scope))}` };
  } catch (e) {
    return { ok: false, texto: e instanceof Error ? e.message : "erro" };
  }
}

export default function ConfigEngenharia() {
  const base = listarTemplates();
  const [codigo, setCodigo] = useState(base[0].codigo);
  const [overrides, setOverrides] = useState<Record<string, ModuloTemplate>>(
    () => carregarOverrides()
  );
  // Rascunho editável do template selecionado.
  const [draft, setDraft] = useState<ModuloTemplate>(() =>
    clonar(carregarOverrides()[base[0].codigo] ?? base[0])
  );
  const [salvoMsg, setSalvoMsg] = useState<string | null>(null);

  function selecionar(cod: string) {
    setCodigo(cod);
    const atual = carregarOverrides()[cod] ?? base.find((t) => t.codigo === cod)!;
    setDraft(clonar(atual));
    setSalvoMsg(null);
  }

  const scope = useMemo(() => escopoTeste(draft), [draft]);
  const customizado = codigo in overrides;

  function setComp(i: number, patch: Partial<Componente>) {
    setDraft((d) => {
      const componentes = d.componentes.map((c, j) =>
        j === i ? { ...c, ...patch } : c
      );
      return { ...d, componentes };
    });
  }
  function setDim(i: number, dim: "altura" | "largura", valor: string) {
    setDraft((d) => {
      const componentes = d.componentes.map((c, j) =>
        j === i ? { ...c, dimensoes: { ...c.dimensoes, [dim]: valor } } : c
      );
      return { ...d, componentes };
    });
  }

  function salvar() {
    const t = { ...draft, versao: draft.versao + 1 };
    salvarOverride(t);
    setOverrides(carregarOverrides());
    setDraft(clonar(t));
    setSalvoMsg("Override salvo. Ele será usado no próximo cálculo.");
  }
  function restaurar() {
    removerOverride(codigo);
    const original = base.find((t) => t.codigo === codigo)!;
    setDraft(clonar(original));
    setOverrides(carregarOverrides());
    setSalvoMsg("Restaurado para o template padrão.");
  }

  return (
    <div className="wrap">
      <header className="top">
        <h1>Engenharia dos módulos</h1>
        <p>
          Defina como cada módulo é montado e como as medidas viram peças de MDF.{" "}
          <a href="/">← calculadora</a> ·{" "}
          <a href="/configuracoes/materiais">Materiais →</a>
        </p>
      </header>

      <div className="toolbar">
        <select value={codigo} onChange={(e) => selecionar(e.target.value)}>
          {base.map((t) => (
            <option key={t.codigo} value={t.codigo}>
              {t.nome} {t.codigo in overrides ? "• customizado" : ""}
            </option>
          ))}
        </select>
        <button className="primary" onClick={salvar}>
          Salvar override
        </button>
        {customizado && (
          <button className="ghost" onClick={restaurar}>
            Restaurar padrão
          </button>
        )}
      </div>

      {salvoMsg && <div className="aviso">{salvoMsg}</div>}

      <div className="card">
        <h2>
          Componentes de {draft.nome} (v{draft.versao})
        </h2>
        <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
          Variáveis: <code>MEDIDA_LARGURA/ALTURA/PROFUNDIDADE</code>,{" "}
          <code>CONFIG_*</code>, <code>PARAM_*</code>. Validação com medidas
          600×720×550mm.
        </p>

        {draft.componentes.map((c, i) => {
          const vq = avaliar(c.quantidade, scope);
          const va = avaliar(c.dimensoes.altura, scope);
          const vl = avaliar(c.dimensoes.largura, scope);
          return (
            <div className="modulo" key={i}>
              <div className="linha">
                <input
                  className="nome"
                  value={c.nome}
                  onChange={(e) => setComp(i, { nome: e.target.value })}
                />
                <select
                  value={c.material_tipo}
                  onChange={(e) =>
                    setComp(i, { material_tipo: e.target.value as Componente["material_tipo"] })
                  }
                  style={{ width: 130 }}
                >
                  {["caixa", "frente", "fundo", "prateleira"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campos">
                <FormulaField
                  rot="Quantidade"
                  valor={c.quantidade}
                  res={vq}
                  onChange={(v) => setComp(i, { quantidade: v })}
                />
                <FormulaField
                  rot="Altura (mm)"
                  valor={c.dimensoes.altura}
                  res={va}
                  onChange={(v) => setDim(i, "altura", v)}
                />
                <FormulaField
                  rot="Largura (mm)"
                  valor={c.dimensoes.largura}
                  res={vl}
                  onChange={(v) => setDim(i, "largura", v)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FormulaField({
  rot,
  valor,
  res,
  onChange,
}: {
  rot: string;
  valor: string;
  res: { ok: boolean; texto: string };
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label>{rot}</label>
      <input value={valor} onChange={(e) => onChange(e.target.value)} />
      <div
        style={{
          fontSize: 11,
          marginTop: 2,
          color: res.ok ? "var(--green)" : "var(--red)",
        }}
      >
        {res.texto}
      </div>
    </div>
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
