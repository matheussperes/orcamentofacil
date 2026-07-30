import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

// Task 13.3b — Design-System.md Seção 7.3 (KPI Card, composição sobre Card,
// sem primitivo shadcn dedicado) + Seção 2.6 (paleta de ícone de KPI, por
// posição — não é status, só variedade visual entre os KPIs de uma mesma
// tela).
const CORES_POSICAO = {
  1: "bg-accent-subtle text-accent",
  2: "bg-sucesso-subtle text-sucesso",
  3: "bg-informacao-subtle text-informacao",
  4: "bg-roxo-subtle text-roxo",
} as const;

export interface KpiCardProps {
  posicao: 1 | 2 | 3 | 4;
  rotulo: string;
  valor: string;
  Icone: ComponentType<{ className?: string }>;
}

export function KpiCard({ posicao, rotulo, valor, Icone }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-cinza-200 bg-cinza-0 p-lg">
      <div className="flex items-center justify-between">
        <p className="text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
          {rotulo}
        </p>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            CORES_POSICAO[posicao]
          )}
        >
          <Icone className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-valor-destaque tabular-nums text-cinza-900">{valor}</p>
    </div>
  );
}
