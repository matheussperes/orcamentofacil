"use client";

import { useState } from "react";
import type { Catalogo } from "@/lib/catalog";
import { espessurasDaCor } from "@/lib/catalog";
import type { SentidoAbrir, SentidoCorrer } from "@/lib/engine/box/types";

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
  temPortaCaixaInteira,
  onAplicarCaixaInteira,
  onAplicarVaosSelecionados,
  onExcluir,
}: {
  vaosSelecionados: string[];
  cores: string[];
  catalogo: Catalogo | null;
  /** Já existe um grupo de porta cobrindo a caixa inteira — bloqueia adicionar
   * portas em vãos internos (evita porta espremida atrás de outra porta). */
  temPortaCaixaInteira: boolean;
  onAplicarCaixaInteira: (cfg: ConfigPortas) => void;
  onAplicarVaosSelecionados: (cfg: ConfigPortas) => void;
  onExcluir: () => void;
}) {
  const [tipoAbertura, setTipoAbertura] = useState<"abrir" | "correr">("abrir");
  const [sentido, setSentido] = useState<SentidoAbrir | SentidoCorrer>("direita");
  const [qtd, setQtd] = useState(2);
  const [cor, setCor] = useState(cores[0] ?? "Branco TX");
  const [espessura, setEspessura] = useState(18);

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
      <h2>Portas</h2>
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
        <button onClick={() => onAplicarCaixaInteira(cfg())}>Aplicar na caixa inteira</button>
        <button
          className="primary"
          disabled={vaosSelecionados.length === 0 || temPortaCaixaInteira}
          title={temPortaCaixaInteira ? "Já existe uma porta cobrindo a caixa inteira — exclua-a antes de adicionar portas em vãos internos." : undefined}
          onClick={() => onAplicarVaosSelecionados(cfg())}
        >
          Aplicar em vãos selecionados
        </button>
        <button className="danger" onClick={onExcluir}>Excluir Portas</button>
      </div>
    </div>
  );
}
