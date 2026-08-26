"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BoxModule, CarcassType } from "@/lib/engine/box/types";
import { SecaoHeader } from "./SecaoHeader";

export function CaixaCard({
  box,
  cores,
  categorias,
  onChange,
  aberta,
  onAbrir,
  onSalvar,
}: {
  box: BoxModule;
  cores: string[];
  categorias: string[];
  onChange: (patch: Partial<BoxModule>) => void;
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
      <SecaoHeader titulo="Caixa" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
            <div>
              <Label htmlFor="caixa-nome">Nome</Label>
              <Input id="caixa-nome" value={box.nome} onChange={(e) => onChange({ nome: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="caixa-categoria">Categoria / ambiente</Label>
              <Select value={box.categoria ?? ""} onValueChange={(v) => onChange({ categoria: v })}>
                <SelectTrigger id="caixa-categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="caixa-tipo">Tipo</Label>
              <Select value={box.tipo} onValueChange={(v) => onChange({ tipo: v as CarcassType })}>
                <SelectTrigger id="caixa-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aereo">Aéreo</SelectItem>
                  <SelectItem value="inferior">Inferior</SelectItem>
                  <SelectItem value="torre">Torre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="caixa-largura">Largura (mm)</Label>
              <Input
                id="caixa-largura"
                type="number"
                value={box.largura}
                onChange={(e) => onChange({ largura: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="caixa-altura">Altura (mm)</Label>
              <Input
                id="caixa-altura"
                type="number"
                value={box.altura}
                onChange={(e) => onChange({ altura: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="caixa-profundidade">Profundidade (mm)</Label>
              <Input
                id="caixa-profundidade"
                type="number"
                value={box.profundidade}
                onChange={(e) => onChange({ profundidade: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="caixa-cor">Cor da caixa</Label>
              <Select
                value={box.caixa.cor}
                onValueChange={(v) => onChange({ caixa: { ...box.caixa, cor: v } })}
              >
                <SelectTrigger id="caixa-cor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cores.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="caixa-espessura">Espessura caixa</Label>
              <Select
                value={String(box.caixa.espessura)}
                onValueChange={(v) => onChange({ caixa: { ...box.caixa, espessura: Number(v) } })}
              >
                <SelectTrigger id="caixa-espessura">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[15, 18].map((e2) => (
                    <SelectItem key={e2} value={String(e2)}>{e2} mm</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="caixa-fundo">Tem fundo</Label>
              <Select
                value={box.temFundo ? "s" : "n"}
                onValueChange={(v) => onChange({ temFundo: v === "s" })}
              >
                <SelectTrigger id="caixa-fundo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="s">Sim</SelectItem>
                  <SelectItem value="n">Não</SelectItem>
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
