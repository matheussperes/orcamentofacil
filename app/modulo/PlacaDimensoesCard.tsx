"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Catalogo } from "@/lib/catalog";
import { espessurasDaCor } from "@/lib/catalog";
import type { Placa } from "@/lib/engine/placa/types";
import { SecaoHeader } from "./SecaoHeader";

// Task 13.1 — seção "dimensoesMaterial" do Editor de Item para Placa
// (capacidades "dimensoes" + "material", Modelo de Domínio Seção 4). O
// sentido do veio (Seção 8) fica só como um toggle Sim/Não de
// `material.temVeio` aqui — a DIREÇÃO em si (`placa.sentidoVeio`) é editada
// no controle visual do painel direito (`PlacaVisual`), só quando temVeio é
// true, conforme o requisito de UX do contrato.
export function PlacaDimensoesCard({
  placa,
  cores,
  catalogo,
  onChange,
  aberta,
  onAbrir,
  onSalvar,
}: {
  placa: Placa;
  cores: string[];
  catalogo: Catalogo | null;
  onChange: (patch: Partial<Placa>) => void;
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
      <SecaoHeader titulo="Dimensões e material" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
            <div>
              <Label htmlFor="placa-nome">Nome</Label>
              <Input
                id="placa-nome"
                value={placa.nome}
                onChange={(e) => onChange({ nome: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="placa-largura">Largura (mm)</Label>
              <Input
                id="placa-largura"
                type="number"
                value={placa.largura}
                onChange={(e) => onChange({ largura: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="placa-altura">Altura (mm)</Label>
              <Input
                id="placa-altura"
                type="number"
                value={placa.altura}
                onChange={(e) => onChange({ altura: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="mt-md grid grid-cols-2 gap-md sm:grid-cols-3">
            <div>
              <Label htmlFor="placa-cor">Cor</Label>
              <Select
                value={placa.material.cor}
                onValueChange={(v) => onChange({ material: { ...placa.material, cor: v } })}
              >
                <SelectTrigger id="placa-cor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cores.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="placa-espessura">Espessura (base)</Label>
              <Select
                value={String(placa.material.espessura)}
                onValueChange={(v) =>
                  onChange({ material: { ...placa.material, espessura: Number(v) } })
                }
              >
                <SelectTrigger id="placa-espessura">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(catalogo ? espessurasDaCor(catalogo, placa.material.cor) : [15, 18]).map((esp) => (
                    <SelectItem key={esp} value={String(esp)}>
                      {esp} mm
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="placa-veio">Material tem veio</Label>
              <Select
                value={placa.material.temVeio ? "s" : "n"}
                onValueChange={(v) =>
                  onChange({ material: { ...placa.material, temVeio: v === "s" } })
                }
              >
                <SelectTrigger id="placa-veio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="n">Não</SelectItem>
                  <SelectItem value="s">Sim</SelectItem>
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
