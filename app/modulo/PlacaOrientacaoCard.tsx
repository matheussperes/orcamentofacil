"use client";

import type { OrientacaoPlaca } from "@/lib/engine/placa/types";
import { SecaoHeader } from "./SecaoHeader";

// Task 13.1 — seção "orientacao" (capacidade "orientacao", Modelo de
// Domínio Seção 4/2). Não confundir com sentido do veio (Seção 8) — é a
// orientação de instalação da placa (horizontal/vertical/alinhada à
// parede), editada na seção "Dimensões e material".
export function PlacaOrientacaoCard({
  orientacao,
  onChange,
  aberta,
  onAbrir,
  onSalvar,
}: {
  orientacao: OrientacaoPlaca;
  onChange: (orientacao: OrientacaoPlaca) => void;
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
      <SecaoHeader titulo="Orientação" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="campos">
            <div>
              <label>Orientação</label>
              <select value={orientacao} onChange={(e) => onChange(e.target.value as OrientacaoPlaca)}>
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
                <option value="alinhada_parede">Alinhada à parede</option>
              </select>
            </div>
          </div>
          <div className="acoes" style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="primary" onClick={onSalvar}>
              Salvar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
