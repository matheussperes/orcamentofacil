"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Ripado } from "@/lib/engine/placa/types";
import { SecaoHeader } from "./SecaoHeader";

const RIPADO_PADRAO: Ripado = { larguraRipa: 100, quantidade: 6 };

// Task 13.1 — seção "ripado" (capacidade "ripado", Modelo de Domínio Seção
// 2.2 / D-06): usuário informa largura da ripa e quantidade, o espaçamento
// é DERIVADO (`explodePlaca` calcula, não é campo aqui).
export function PlacaRipadoCard({
  ripado,
  onChange,
  aberta,
  onAbrir,
  onSalvar,
}: {
  ripado: Ripado | undefined;
  onChange: (ripado: Ripado | undefined) => void;
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
      <SecaoHeader titulo="Ripado" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
            <div>
              <Label htmlFor="ripado-ativar">Ativar ripado</Label>
              <Select
                value={ripado ? "s" : "n"}
                onValueChange={(v) => onChange(v === "s" ? (ripado ?? RIPADO_PADRAO) : undefined)}
              >
                <SelectTrigger id="ripado-ativar">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="n">Não</SelectItem>
                  <SelectItem value="s">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {ripado && (
              <>
                <div>
                  <Label htmlFor="ripado-largura">Largura da ripa (mm)</Label>
                  <Input
                    id="ripado-largura"
                    type="number"
                    min={1}
                    value={ripado.larguraRipa}
                    onChange={(e) => onChange({ ...ripado, larguraRipa: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="ripado-quantidade">Quantidade</Label>
                  <Input
                    id="ripado-quantidade"
                    type="number"
                    min={1}
                    value={ripado.quantidade}
                    onChange={(e) => onChange({ ...ripado, quantidade: Number(e.target.value) })}
                  />
                </div>
              </>
            )}
          </div>
          {ripado && (
            <p className="mt-sm text-corpo-pequeno text-cinza-500">
              Espaçamento entre ripas é calculado automaticamente (veja o painel de peças à
              direita).
            </p>
          )}
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
