"use client";

import type { BordaPorLado, LadoPlaca } from "@/lib/engine/placa/types";
import { SecaoHeader } from "./SecaoHeader";

// Task 13.1 — seção "bordaPorLado" (capacidade "bordaPorLado", Modelo de
// Domínio Seção 2 — "acabamento de fita por lado"). `AcabamentoBorda` hoje
// só carrega `presente: boolean` (lacuna documentada em
// lib/engine/placa/types.ts — largura da fita é metadado de pricing, fora
// desta task).
const LADOS: { value: LadoPlaca; label: string }[] = [
  { value: "superior", label: "Superior" },
  { value: "inferior", label: "Inferior" },
  { value: "esquerda", label: "Esquerda" },
  { value: "direita", label: "Direita" },
];

export function PlacaBordaCard({
  bordaPorLado,
  onChange,
  aberta,
  onAbrir,
  onSalvar,
}: {
  bordaPorLado: BordaPorLado | undefined;
  onChange: (bordaPorLado: BordaPorLado) => void;
  aberta: boolean;
  onAbrir: () => void;
  onSalvar: () => void;
}) {
  function toggle(lado: LadoPlaca) {
    const atual = bordaPorLado?.[lado]?.presente ?? false;
    onChange({ ...bordaPorLado, [lado]: { presente: !atual } });
  }

  return (
    <div
      className={
        aberta
          ? "rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs"
          : "cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:bg-cinza-100"
      }
    >
      <SecaoHeader titulo="Borda (fita)" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="campos">
            {LADOS.map((l) => (
              <div key={l.value}>
                <label>{l.label}</label>
                <select
                  value={bordaPorLado?.[l.value]?.presente ? "s" : "n"}
                  onChange={() => toggle(l.value)}
                >
                  <option value="n">Sem fita</option>
                  <option value="s">Com fita</option>
                </select>
              </div>
            ))}
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
