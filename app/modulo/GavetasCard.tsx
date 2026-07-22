"use client";

import { useEffect, useState } from "react";
import type { Catalogo } from "@/lib/catalog";
import { espessurasDaCor } from "@/lib/catalog";
import { SecaoHeader } from "./SecaoHeader";

export interface ConfigGaveta {
  interna: boolean;
  qtd: number;
  profundidade: number;
  cor: string;
  espessura: number;
}

export interface GavetaEmEdicao {
  vaoId: string;
  config: ConfigGaveta;
}

export function GavetasCard({
  vaosSelecionados,
  cores,
  catalogo,
  modoSelecaoGavetas,
  onSelecionarModoGavetas,
  gavetaEmEdicao,
  onAplicar,
  onSalvarEdicao,
  onExcluirEdicao,
  onCancelarEdicao,
  onExcluir,
  aberta,
  onAbrir,
  onSalvar,
}: {
  vaosSelecionados: string[];
  cores: string[];
  catalogo: Catalogo | null;
  /** true quando o canvas está no modo "Selecionar gaveta" (destaca o botão). */
  modoSelecaoGavetas: boolean;
  onSelecionarModoGavetas: () => void;
  /** Vão com gaveta selecionado no canvas (modo "Selecionar gaveta") pra editar/excluir. */
  gavetaEmEdicao: GavetaEmEdicao | null;
  onAplicar: (cfg: ConfigGaveta) => void;
  onSalvarEdicao: (vaoId: string, cfg: ConfigGaveta) => void;
  onExcluirEdicao: (vaoId: string) => void;
  onCancelarEdicao: () => void;
  onExcluir: () => void;
  aberta: boolean;
  onAbrir: () => void;
  onSalvar: () => void;
}) {
  const [interna, setInterna] = useState(false);
  const [qtd, setQtd] = useState(4);
  const [profundidade, setProfundidade] = useState(450);
  const [cor, setCor] = useState(cores[0] ?? "Branco TX");
  const [espessura, setEspessura] = useState(18);

  useEffect(() => {
    if (!gavetaEmEdicao) return;
    setInterna(gavetaEmEdicao.config.interna);
    setQtd(gavetaEmEdicao.config.qtd);
    setProfundidade(gavetaEmEdicao.config.profundidade);
    setCor(gavetaEmEdicao.config.cor);
    setEspessura(gavetaEmEdicao.config.espessura);
  }, [gavetaEmEdicao]);

  function cfg(): ConfigGaveta {
    return { interna, qtd, profundidade, cor, espessura };
  }

  return (
    <div
      className={
        aberta
          ? "rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs"
          : "cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:bg-cinza-100"
      }
    >
      <SecaoHeader titulo="Gavetas" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="acoes" style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button className={modoSelecaoGavetas ? "primary" : "ghost"} onClick={onSelecionarModoGavetas}>
              Selecionar gaveta
            </button>
          </div>

          {gavetaEmEdicao && (
            <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
              Editando o conjunto de gavetas selecionado no desenho.
            </p>
          )}

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

          <div className="acoes" style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {gavetaEmEdicao ? (
              <>
                <button className="primary" onClick={() => onSalvarEdicao(gavetaEmEdicao.vaoId, cfg())}>
                  Salvar alterações
                </button>
                <button className="danger" onClick={() => onExcluirEdicao(gavetaEmEdicao.vaoId)}>Excluir</button>
                <button className="ghost" onClick={onCancelarEdicao}>Cancelar</button>
              </>
            ) : (
              <>
                <button className="primary" disabled={vaosSelecionados.length === 0} onClick={() => onAplicar(cfg())}>
                  Aplicar no vão
                </button>
                <button className="danger" disabled={vaosSelecionados.length === 0} onClick={onExcluir}>
                  Excluir Gavetas
                </button>
              </>
            )}
          </div>

          <div className="acoes" style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="primary" onClick={onSalvar}>Salvar</button>
          </div>
        </>
      )}
    </div>
  );
}
