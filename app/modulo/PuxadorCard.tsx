"use client";

import type { TipoPuxador } from "@/lib/engine/box/types";
import { SecaoHeader } from "./SecaoHeader";

// Config única por caixa, vale pra toda porta e frente de gaveta externa.
// Afeta o desenho (posição do puxador ou perfil na frente) e os insumos
// (ferragem "puxador" un. na Haste, "perfil_puxador_m" por metro no Perfil,
// nenhuma no Sem Puxador) — ver lib/engine/box/explode.ts.
export function PuxadorCard({
  tipo,
  onChange,
  aberta,
  onAbrir,
  onSalvar,
}: {
  tipo: TipoPuxador;
  onChange: (tipo: TipoPuxador) => void;
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
      <SecaoHeader titulo="Puxador" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="campos">
            <div>
              <label>Tipo</label>
              <select value={tipo} onChange={(e) => onChange(e.target.value as TipoPuxador)}>
                <option value="haste">Haste</option>
                <option value="perfil">Perfil</option>
                <option value="sem_puxador">Sem Puxador</option>
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
