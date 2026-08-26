"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
          : "cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:bg-cinza-100 transition-colors duration-150"
      }
    >
      <SecaoHeader titulo="Borda (fita)" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
            {LADOS.map((l) => (
              <div key={l.value}>
                <Label htmlFor={`borda-${l.value}`}>{l.label}</Label>
                <Select
                  value={bordaPorLado?.[l.value]?.presente ? "s" : "n"}
                  onValueChange={() => toggle(l.value)}
                >
                  <SelectTrigger id={`borda-${l.value}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="n">Sem fita</SelectItem>
                    <SelectItem value="s">Com fita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="mt-md flex items-center gap-xs">
            <Button variant="outline" onClick={onSalvar}>
              Avançar
              <ChevronRight size={14} />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
