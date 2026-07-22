"use client";

import { useState } from "react";
import type { PosicaoDivisao } from "@/lib/engine/box/types";
import { SecaoHeader } from "./SecaoHeader";

export interface ConfigDivisao {
  split: "vertical" | "horizontal";
  qtd: number;
  recuoFrontal: number;
  posicao: PosicaoDivisao;
  recuoLateral: number;
}

export function DivisoesCard({
  vaosSelecionados,
  divisaoSelecionada,
  modoSelecaoDivisoes,
  onSelecionarModoDivisoes,
  onAplicar,
  onExcluir,
  aberta,
  onAbrir,
  onSalvar,
}: {
  vaosSelecionados: string[];
  divisaoSelecionada: { parentId: string; indice: number } | null;
  /** true quando o canvas está no modo "Selecionar divisões" (destaca o botão). */
  modoSelecaoDivisoes: boolean;
  onSelecionarModoDivisoes: () => void;
  onAplicar: (cfg: ConfigDivisao) => void;
  onExcluir: () => void;
  aberta: boolean;
  onAbrir: () => void;
  onSalvar: () => void;
}) {
  const [split, setSplit] = useState<"vertical" | "horizontal">("vertical");
  const [qtd, setQtd] = useState(1);
  const [recuoFrontal, setRecuoFrontal] = useState(20);
  const [posicao, setPosicao] = useState<PosicaoDivisao>("centralizado");
  const [recuoLateral, setRecuoLateral] = useState(0);

  return (
    <div
      className={
        aberta
          ? "rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs"
          : "cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:bg-cinza-100"
      }
    >
      <SecaoHeader titulo="Divisões" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="acoes" style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button className={modoSelecaoDivisoes ? "primary" : "ghost"} onClick={onSelecionarModoDivisoes}>
              Selecionar divisões
            </button>
          </div>

          <div className="campos">
            <div>
              <label>Tipo</label>
              <select value={split} onChange={(e) => setSplit(e.target.value as "vertical" | "horizontal")}>
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </div>
            <div>
              <label>Quantidade</label>
              <input type="number" min={1} value={qtd} onChange={(e) => setQtd(Number(e.target.value))} />
            </div>
            <div>
              <label>Recuo frontal</label>
              <input type="number" min={0} value={recuoFrontal} onChange={(e) => setRecuoFrontal(Number(e.target.value))} />
            </div>
          </div>

          <div className="campos" style={{ marginTop: 10 }}>
            <div>
              <label>Posição</label>
              <select value={posicao} onChange={(e) => setPosicao(e.target.value as PosicaoDivisao)}>
                <option value="centralizado">Centralizado</option>
                <option value="direita">Direita</option>
                <option value="esquerda">Esquerda</option>
              </select>
            </div>
            <div>
              <label>Recuo Lateral</label>
              <input
                type="number"
                min={0}
                value={recuoLateral}
                disabled={posicao === "centralizado"}
                onChange={(e) => setRecuoLateral(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="acoes" style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              className="primary"
              disabled={vaosSelecionados.length === 0}
              onClick={() => onAplicar({ split, qtd, recuoFrontal, posicao, recuoLateral })}
            >
              Aplicar
            </button>
            <button className="danger" disabled={!divisaoSelecionada} onClick={onExcluir}>
              Excluir
            </button>
            <button className="primary" onClick={onSalvar}>Salvar</button>
          </div>
        </>
      )}
    </div>
  );
}
