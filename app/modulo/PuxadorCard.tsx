"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
          : "cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:bg-cinza-100 transition-colors duration-150"
      }
    >
      <SecaoHeader titulo="Puxador" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
            <div>
              <Label htmlFor="puxador-tipo">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => onChange(v as TipoPuxador)}>
                <SelectTrigger id="puxador-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="haste">Haste</SelectItem>
                  <SelectItem value="perfil">Perfil</SelectItem>
                  <SelectItem value="sem_puxador">Sem Puxador</SelectItem>
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
