"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { PosicaoDivisao } from "@/lib/engine/box/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecaoHeader } from "./SecaoHeader";

export interface ConfigDivisao {
  split: "vertical" | "horizontal";
  qtd: number;
  recuoFrontal: number;
  posicao: PosicaoDivisao;
  recuoLateral: number;
}

export function DivisoesCard({
  vaosSelecionados,
  divisaoSelecionada,
  modoSelecaoDivisoes,
  onSelecionarModoDivisoes,
  onAplicar,
  onExcluir,
  aberta,
  onAbrir,
  onSalvar,
}: {
  vaosSelecionados: string[];
  divisaoSelecionada: { parentId: string; indice: number } | null;
  /** true quando o canvas está no modo "Selecionar divisões" (destaca o botão). */
  modoSelecaoDivisoes: boolean;
  onSelecionarModoDivisoes: () => void;
  onAplicar: (cfg: ConfigDivisao) => void;
  onExcluir: () => void;
  aberta: boolean;
  onAbrir: () => void;
  onSalvar: () => void;
}) {
  const [split, setSplit] = useState<"vertical" | "horizontal">("vertical");
  const [qtd, setQtd] = useState(1);
  const [recuoFrontal, setRecuoFrontal] = useState(20);
  const [posicao, setPosicao] = useState<PosicaoDivisao>("centralizado");
  const [recuoLateral, setRecuoLateral] = useState(0);

  return (
    <div
      className={
        aberta
          ? "rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs"
          : "cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:bg-cinza-100 transition-colors duration-150"
      }
    >
      <SecaoHeader titulo="Divisões" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="flex flex-wrap gap-sm mb-sm">
            <Button
              variant={modoSelecaoDivisoes ? "iconActive" : "ghost"}
              size="sm"
              onClick={onSelecionarModoDivisoes}
            >
              Selecionar divisões
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
            <div>
              <Label htmlFor="divisoes-tipo">Tipo</Label>
              <Select value={split} onValueChange={(v) => setSplit(v as "vertical" | "horizontal")}>
                <SelectTrigger id="divisoes-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vertical">Vertical</SelectItem>
                  <SelectItem value="horizontal">Horizontal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="divisoes-qtd">Quantidade</Label>
              <Input
                id="divisoes-qtd"
                type="number"
                min={1}
                value={qtd}
                onChange={(e) => setQtd(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="divisoes-recuo-frontal">Recuo frontal</Label>
              <Input
                id="divisoes-recuo-frontal"
                type="number"
                min={0}
                value={recuoFrontal}
                onChange={(e) => setRecuoFrontal(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-md grid grid-cols-2 gap-md sm:grid-cols-3">
            <div>
              <Label htmlFor="divisoes-posicao">Posição</Label>
              <Select value={posicao} onValueChange={(v) => setPosicao(v as PosicaoDivisao)}>
                <SelectTrigger id="divisoes-posicao">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="centralizado">Centralizado</SelectItem>
                  <SelectItem value="direita">Direita</SelectItem>
                  <SelectItem value="esquerda">Esquerda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="divisoes-recuo-lateral">Recuo Lateral</Label>
              <Input
                id="divisoes-recuo-lateral"
                type="number"
                min={0}
                value={recuoLateral}
                disabled={posicao === "centralizado"}
                onChange={(e) => setRecuoLateral(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="mt-md flex flex-wrap items-center gap-xs">
            <Button
              disabled={vaosSelecionados.length === 0}
              onClick={() => onAplicar({ split, qtd, recuoFrontal, posicao, recuoLateral })}
            >
              Aplicar
            </Button>
            <Button variant="danger" disabled={!divisaoSelecionada} onClick={onExcluir}>
              Excluir
            </Button>
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
