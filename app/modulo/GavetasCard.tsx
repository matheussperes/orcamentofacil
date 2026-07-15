"use client";

import { useState } from "react";
import type { Catalogo } from "@/lib/catalog";
import { espessurasDaCor } from "@/lib/catalog";

export interface ConfigGaveta {
  interna: boolean;
  qtd: number;
  profundidade: number;
  cor: string;
  espessura: number;
}

export function GavetasCard({
  vaosSelecionados,
  cores,
  catalogo,
  onAplicar,
  onExcluir,
}: {
  vaosSelecionados: string[];
  cores: string[];
  catalogo: Catalogo | null;
  onAplicar: (cfg: ConfigGaveta) => void;
  onExcluir: () => void;
}) {
  const [interna, setInterna] = useState(false);
  const [qtd, setQtd] = useState(4);
  const [profundidade, setProfundidade] = useState(450);
  const [cor, setCor] = useState(cores[0] ?? "Branco TX");
  const [espessura, setEspessura] = useState(18);

  function cfg(): ConfigGaveta {
    return { interna, qtd, profundidade, cor, espessura };
  }

  return (
    <div className="card">
      <h2>Gavetas</h2>
      <div className="campos">
        <div>
          <label>Tipo</label>
          <select value={interna ? "int" : "ext"} onChange={(e) => setInterna(e.target.value === "int")}>
            <option value="ext">Externa</option>
            <option value="int">Interna (guarda-roupa)</option>
          </select>
        </div>
        <div>
          <label>Quantidade</label>
          <input type="number" min={1} value={qtd} onChange={(e) => setQtd(Number(e.target.value))} />
        </div>
        <div>
          <label>Profundidade</label>
          <input type="number" value={profundidade} onChange={(e) => setProfundidade(Number(e.target.value))} />
        </div>
        {!interna && (
          <>
            <div>
              <label>Cor</label>
              <select value={cor} onChange={(e) => setCor(e.target.value)}>
                {cores.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label>Espessura</label>
              <select value={espessura} onChange={(e) => setEspessura(Number(e.target.value))}>
                {(catalogo ? espessurasDaCor(catalogo, cor) : [15, 18]).map((esp) => (
                  <option key={esp} value={esp}>{esp} mm</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
      <div className="acoes" style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="primary" disabled={vaosSelecionados.length === 0} onClick={() => onAplicar(cfg())}>
          Aplicar no vão
        </button>
        <button className="danger" disabled={vaosSelecionados.length === 0} onClick={onExcluir}>
          Excluir Gavetas
        </button>
      </div>
    </div>
  );
}
