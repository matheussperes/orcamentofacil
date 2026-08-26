"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Engrossamento, NivelEngrossamento } from "@/lib/engine/placa/types";
import { SecaoHeader } from "./SecaoHeader";

const SARRAFO_LARGURA_PADRAO = 70; // mm — mesmo default de lib/engine/placa/explode.ts

const RÓTULO_LADO: Record<string, string> = {
  superior: "Superior",
  inferior: "Inferior",
  esquerda: "Esquerda",
  direita: "Direita",
};

// Task 13.1 — seção "engrossamento" (capacidade "engrossamento", Modelo de
// Domínio Seção 2.1). A seleção dos LADOS acontece na referência visual do
// painel direito (`PlacaVisual`, requisito de UX 2.1.1 — mesmo padrão de
// "selecionar no canvas, configurar no card" já usado por Divisões/Portas/
// Gavetas do módulo-caixa); aqui só mostra o resumo (badges) e os campos de
// técnica/nível/sarrafo. Nível 3 é filtrado quando a espessura BASE é 18mm
// (Modelo de Domínio, decisão do operador 2026-07-27 — 72mm excede a maior
// fita do catálogo); o motor (`validarNivelEspessuraBase`) já é a rede de
// segurança final, isto é só a UI não oferecendo a combinação inválida.
export function PlacaEngrossamentoCard({
  engrossamento,
  espessuraBase,
  onChange,
  aberta,
  onAbrir,
  onSalvar,
}: {
  engrossamento: Engrossamento | undefined;
  espessuraBase: number;
  onChange: (engrossamento: Engrossamento | undefined) => void;
  aberta: boolean;
  onAbrir: () => void;
  onSalvar: () => void;
}) {
  const niveisDisponiveis: NivelEngrossamento[] = espessuraBase === 18 ? [1, 2] : [1, 2, 3];
  const tecnica = engrossamento?.tecnica ?? "nenhum";

  function mudarTecnica(t: "nenhum" | "engrossada" | "dobrada") {
    if (t === "nenhum") {
      onChange(undefined);
    } else if (t === "engrossada") {
      onChange({
        tecnica: "engrossada",
        nivel: 1,
        lados: engrossamento?.tecnica === "engrossada" ? engrossamento.lados : [],
        larguraSarrafo:
          engrossamento?.tecnica === "engrossada" ? engrossamento.larguraSarrafo : SARRAFO_LARGURA_PADRAO,
      });
    } else {
      onChange({ tecnica: "dobrada", nivel: engrossamento?.nivel ?? 1 });
    }
  }

  function mudarNivel(nivel: NivelEngrossamento) {
    if (!engrossamento) return;
    onChange({ ...engrossamento, nivel });
  }

  const ladosSelecionados = engrossamento?.tecnica === "engrossada" ? engrossamento.lados : [];

  return (
    <div
      className={
        aberta
          ? "rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs"
          : "cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:bg-cinza-100"
      }
    >
      <SecaoHeader titulo="Engrossamento" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
            <div>
              <Label htmlFor="engrossamento-tecnica">Técnica</Label>
              <Select
                value={tecnica}
                onValueChange={(v) => mudarTecnica(v as "nenhum" | "engrossada" | "dobrada")}
              >
                <SelectTrigger id="engrossamento-tecnica">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  <SelectItem value="engrossada">Engrossada (sarrafos nas bordas)</SelectItem>
                  <SelectItem value="dobrada">Dobrada (placas laminadas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {engrossamento && (
              <div>
                <Label htmlFor="engrossamento-nivel">Nível</Label>
                <Select
                  value={String(engrossamento.nivel)}
                  onValueChange={(v) => mudarNivel(Number(v) as NivelEngrossamento)}
                >
                  <SelectTrigger id="engrossamento-nivel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {niveisDisponiveis.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        Nível {n} ({espessuraBase * (1 + n)}mm)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {engrossamento?.tecnica === "engrossada" && (
              <div>
                <Label htmlFor="engrossamento-sarrafo">Largura do sarrafo (mm)</Label>
                <Input
                  id="engrossamento-sarrafo"
                  type="number"
                  min={1}
                  value={engrossamento.larguraSarrafo ?? SARRAFO_LARGURA_PADRAO}
                  onChange={(e) => onChange({ ...engrossamento, larguraSarrafo: Number(e.target.value) })}
                />
              </div>
            )}
          </div>

          {engrossamento?.tecnica === "engrossada" && (
            <div className="mt-md">
              <Label>Lados selecionados</Label>
              {ladosSelecionados.length === 0 ? (
                <p className="text-corpo-pequeno text-cinza-500">
                  Nenhum lado selecionado ainda — clique na referência visual à direita.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {ladosSelecionados.map((l) => (
                    <span
                      key={l}
                      className="rounded-sm border border-accent-border bg-accent-subtle px-2 py-1 text-legenda text-accent"
                    >
                      {RÓTULO_LADO[l]}
                    </span>
                  ))}
                </div>
              )}
            </div>
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
