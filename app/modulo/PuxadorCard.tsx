"use client";

import type { TipoPuxador } from "@/lib/engine/box/types";

// Config única por caixa, vale pra toda porta e frente de gaveta externa.
// Afeta o desenho (posição do puxador ou perfil na frente) e os insumos
// (ferragem "puxador" un. na Haste, "perfil_puxador_m" por metro no Perfil,
// nenhuma no Sem Puxador) — ver lib/engine/box/explode.ts.
export function PuxadorCard({
  tipo,
  onChange,
}: {
  tipo: TipoPuxador;
  onChange: (tipo: TipoPuxador) => void;
}) {
  return (
    <div className="card">
      <h2>Puxador</h2>
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
    </div>
  );
}
