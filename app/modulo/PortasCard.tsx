"use client";

import { useEffect, useState } from "react";
import type { Catalogo } from "@/lib/catalog";
import { espessurasDaCor } from "@/lib/catalog";
import type { GrupoPortas, SentidoAbrir, SentidoCorrer } from "@/lib/engine/box/types";
import { SecaoHeader } from "./SecaoHeader";

export interface ConfigPortas {
  tipoAbertura: "abrir" | "correr";
  sentido: SentidoAbrir | SentidoCorrer;
  qtd: number;
  cor: string;
  espessura: number;
}

const SENTIDOS_ABRIR: { value: SentidoAbrir; label: string }[] = [
  { value: "basculante_pia", label: "Basculante Pia" },
  { value: "basculante_aereo", label: "Basculante Aéreo" },
  { value: "direita", label: "Direita" },
  { value: "esquerda", label: "Esquerda" },
];
const SENTIDOS_CORRER: { value: SentidoCorrer; label: string }[] = [
  { value: "direita", label: "Direita" },
  { value: "esquerda", label: "Esquerda" },
];

export function PortasCard({
  vaosSelecionados,
  cores,
  catalogo,
  modoSelecaoPortas,
  onSelecionarModoPortas,
  grupoEmEdicao,
  onAplicarVaosSelecionados,
  onSalvarEdicao,
  onExcluirGrupo,
  onCancelarEdicao,
  onExcluirPorVaos,
  aberta,
  onAbrir,
  onSalvar,
}: {
  vaosSelecionados: string[];
  cores: string[];
  catalogo: Catalogo | null;
  /** true quando o canvas está no modo "Selecionar portas" (destaca o botão). */
  modoSelecaoPortas: boolean;
  onSelecionarModoPortas: () => void;
  /** Grupo de porta selecionado no canvas (modo "Selecionar portas") pra editar/excluir. */
  grupoEmEdicao: GrupoPortas | null;
  onAplicarVaosSelecionados: (cfg: ConfigPortas) => void;
  onSalvarEdicao: (id: string, cfg: ConfigPortas) => void;
  onExcluirGrupo: (id: string) => void;
  onCancelarEdicao: () => void;
  onExcluirPorVaos: () => void;
  aberta: boolean;
  onAbrir: () => void;
  onSalvar: () => void;
}) {
  const [tipoAbertura, setTipoAbertura] = useState<"abrir" | "correr">("abrir");
  const [sentido, setSentido] = useState<SentidoAbrir | SentidoCorrer>("direita");
  const [qtd, setQtd] = useState(2);
  const [cor, setCor] = useState(cores[0] ?? "Branco TX");
  const [espessura, setEspessura] = useState(18);

  // Vão selecionou um grupo existente (modo "Selecionar portas") -> carrega a
  // config dele no formulário pra edição.
  useEffect(() => {
    if (!grupoEmEdicao) return;
    setTipoAbertura(grupoEmEdicao.tipoAbertura);
    setSentido(grupoEmEdicao.sentido);
    setQtd(grupoEmEdicao.qtd);
    setCor(grupoEmEdicao.material.cor);
    setEspessura(grupoEmEdicao.material.espessura);
  }, [grupoEmEdicao]);

  const opcoesSentido = tipoAbertura === "abrir" ? SENTIDOS_ABRIR : SENTIDOS_CORRER;

  function trocarTipoAbertura(t: "abrir" | "correr") {
    setTipoAbertura(t);
    const opcoes = t === "abrir" ? SENTIDOS_ABRIR : SENTIDOS_CORRER;
    setSentido(opcoes[0].value);
  }

  function cfg(): ConfigPortas {
    return { tipoAbertura, sentido, qtd, cor, espessura };
  }

  return (
    <div className="card">
      <SecaoHeader titulo="Portas" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="acoes" style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button className={modoSelecaoPortas ? "primary" : "ghost"} onClick={onSelecionarModoPortas}>
              Selecionar portas
            </button>
          </div>

          {grupoEmEdicao && (
            <p className="muted" style={{ fontSize: 12, marginTop: -4 }}>
              Editando a porta selecionada no desenho.
            </p>
          )}

          <div className="campos">
            <div>
              <label>Tipos</label>
              <select value={tipoAbertura} onChange={(e) => trocarTipoAbertura(e.target.value as "abrir" | "correr")}>
                <option value="abrir">Abrir</option>
                <option value="correr">Correr</option>
              </select>
            </div>
            <div>
              <label>Sentido</label>
              <select value={sentido} onChange={(e) => setSentido(e.target.value as SentidoAbrir | SentidoCorrer)}>
                {opcoesSentido.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="campos" style={{ marginTop: 8 }}>
            <div>
              <label>Quantidade</label>
              <input type="number" min={1} value={qtd} onChange={(e) => setQtd(Number(e.target.value))} />
            </div>
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
          </div>

          <div className="acoes" style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {grupoEmEdicao ? (
              <>
                <button className="primary" onClick={() => onSalvarEdicao(grupoEmEdicao.id, cfg())}>
                  Salvar alterações
                </button>
                <button className="danger" onClick={() => onExcluirGrupo(grupoEmEdicao.id)}>Excluir</button>
                <button className="ghost" onClick={onCancelarEdicao}>Cancelar</button>
              </>
            ) : (
              <>
                <button
                  className="primary"
                  disabled={vaosSelecionados.length === 0}
                  onClick={() => onAplicarVaosSelecionados(cfg())}
                >
                  Aplicar em vãos selecionados
                </button>
                <button className="danger" onClick={onExcluirPorVaos}>Excluir Portas</button>
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
