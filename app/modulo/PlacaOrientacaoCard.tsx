"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
          : "cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:bg-cinza-100 transition-colors duration-150"
      }
    >
      <SecaoHeader titulo="Orientação" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
            <div>
              <Label htmlFor="placa-orientacao">Orientação</Label>
              <Select value={orientacao} onValueChange={(v) => onChange(v as OrientacaoPlaca)}>
                <SelectTrigger id="placa-orientacao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="horizontal">Horizontal</SelectItem>
                  <SelectItem value="vertical">Vertical</SelectItem>
                  <SelectItem value="alinhada_parede">Alinhada à parede</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
