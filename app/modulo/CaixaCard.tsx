"use client";

import type { BoxModule, CarcassType } from "@/lib/engine/box/types";
import { SecaoHeader } from "./SecaoHeader";

export function CaixaCard({
  box,
  cores,
  categorias,
  onChange,
  aberta,
  onAbrir,
  onSalvar,
}: {
  box: BoxModule;
  cores: string[];
  categorias: string[];
  onChange: (patch: Partial<BoxModule>) => void;
  aberta: boolean;
  onAbrir: () => void;
  onSalvar: () => void;
}) {
  return (
    <div
      className={
        aberta
          ? "rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs"
          : "cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:bg-cinza-100"
      }
    >
      <SecaoHeader titulo="Caixa" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
      <div className="campos">
        <div>
          <label>Nome</label>
          <input value={box.nome} onChange={(e) => onChange({ nome: e.target.value })} />
        </div>
        <div>
          <label>Categoria / ambiente</label>
          <select value={box.categoria ?? ""} onChange={(e) => onChange({ categoria: e.target.value })}>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Tipo</label>
          <select value={box.tipo} onChange={(e) => onChange({ tipo: e.target.value as CarcassType })}>
            <option value="aereo">Aéreo</option>
            <option value="inferior">Inferior</option>
            <option value="torre">Torre</option>
          </select>
        </div>
        <div>
          <label>Largura (mm)</label>
          <input type="number" value={box.largura} onChange={(e) => onChange({ largura: Number(e.target.value) })} />
        </div>
        <div>
          <label>Altura (mm)</label>
          <input type="number" value={box.altura} onChange={(e) => onChange({ altura: Number(e.target.value) })} />
        </div>
        <div>
          <label>Profundidade (mm)</label>
          <input type="number" value={box.profundidade} onChange={(e) => onChange({ profundidade: Number(e.target.value) })} />
        </div>
        <div>
          <label>Cor da caixa</label>
          <select value={box.caixa.cor} onChange={(e) => onChange({ caixa: { ...box.caixa, cor: e.target.value } })}>
            {cores.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Espessura caixa</label>
          <select
            value={box.caixa.espessura}
            onChange={(e) => onChange({ caixa: { ...box.caixa, espessura: Number(e.target.value) } })}
          >
            {[15, 18].map((e2) => (
              <option key={e2} value={e2}>{e2} mm</option>
            ))}
          </select>
        </div>
        <div>
          <label>Tem fundo</label>
          <select value={box.temFundo ? "s" : "n"} onChange={(e) => onChange({ temFundo: e.target.value === "s" })}>
            <option value="s">Sim</option>
            <option value="n">Não</option>
          </select>
        </div>
      </div>
      <div className="acoes" style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button className="primary" onClick={onSalvar}>Salvar</button>
      </div>
        </>
      )}
    </div>
  );
}
