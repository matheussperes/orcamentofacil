import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { TracoDeCota } from "./traco-de-cota";

// Task 6.2 — Design-System.md Seção 6.5: componente customizado sobre
// primitivos Tailwind (sem equivalente shadcn direto). Reutilizável entre o
// NovoModuloWizard (Ambiente→Tipo→Modelo) e, futuramente, o accordion do
// editor de módulo.
export interface StepperProps {
  /** Rótulo de cada etapa, na ordem em que aparecem. */
  steps: string[];
  /** Índice (0-based) da etapa atual. Etapas anteriores contam como concluídas. */
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  const total = steps.length;
  const passoAtual = Math.min(Math.max(currentStep, 0), total - 1);
  const rotuloAtual = steps[passoAtual] ?? "";
  const progressoPercentual = total > 0 ? ((passoAtual + 1) / total) * 100 : 0;

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop (>=768px): stepper horizontal com círculos conectados */}
      <div className="hidden md:flex md:items-start">
        {steps.map((label, index) => {
          const isCompleted = index < passoAtual;
          const isCurrent = index === passoAtual;
          const isLast = index === total - 1;

          return (
            <div key={label} className="contents">
              <div className="flex flex-none flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border-2 text-legenda",
                    isCompleted && "border-accent bg-accent",
                    isCurrent &&
                      "border-accent bg-accent-subtle font-semibold text-accent",
                    !isCompleted && !isCurrent && "border-cinza-300 bg-cinza-0 text-cinza-400"
                  )}
                >
                  {isCompleted ? <Check size={14} className="text-cinza-0" /> : index + 1}
                </div>
                <span
                  className={cn(
                    "text-legenda",
                    isCompleted ? "text-cinza-900" : "text-cinza-600"
                  )}
                >
                  {label}
                </span>
              </div>
              {!isLast && (
                <TracoDeCota
                  className={cn(
                    "mx-2 mt-3 h-2 flex-1",
                    isCompleted ? "text-accent" : "text-cinza-300"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* <768px: colapsa para rótulo compacto + barra fina (evita overflow horizontal) */}
      <div className="md:hidden">
        <p className="text-corpo-pequeno text-cinza-600">
          Passo {passoAtual + 1} de {total} — {rotuloAtual}
        </p>
        <div className="mt-1 h-1 w-full rounded-full bg-cinza-200">
          <div
            className="h-1 rounded-full bg-accent transition-all duration-120"
            style={{ width: `${progressoPercentual}%` }}
          />
        </div>
      </div>
    </div>
  );
}
