import * as React from "react";

import { cn } from "@/lib/utils";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — Design-System.md
// Seção 7.21: track `bg-cinza-200 rounded-full h-2`, preenchimento
// `bg-sucesso` (aproveitamento/utilização) | `bg-accent` (progresso
// genérico) | `bg-erro` (abaixo de 40%, Seção 9.4). Primeiro consumo:
// barra de aproveitamento por chapa em `CorteMaterialLab` (aba Corte &
// Material).
//
// Implementado como `<div>` simples (sem `@radix-ui/react-progress`, que não
// estava em `package.json` antes desta task) porque é só uma barra visual
// não-interativa — nenhum dos usos previstos (Seção 7.21/9.4) precisa de
// teclado/foco/drag do Radix. Se um uso futuro precisar de comportamento
// interativo, trocar a implementação por `@radix-ui/react-progress` é
// decisão futura, não um problema desta task.
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. Valores fora do intervalo são recortados (clamp). */
  value: number;
  /** Cor do preenchimento — Design-System Seção 7.21/9.4 já definem os 3
   * casos de uso; nenhuma outra cor é um token válido aqui. */
  corPreenchimento?: "sucesso" | "accent" | "erro";
}

const CORES_PREENCHIMENTO: Record<NonNullable<ProgressProps["corPreenchimento"]>, string> = {
  sucesso: "bg-sucesso",
  accent: "bg-accent",
  erro: "bg-erro",
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, corPreenchimento = "accent", ...props }, ref) => {
    const percentual = Math.min(100, Math.max(0, value));
    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={percentual}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("h-2 w-full overflow-hidden rounded-full bg-cinza-200", className)}
        {...props}
      >
        <div
          className={cn("h-full rounded-full transition-colors duration-120", CORES_PREENCHIMENTO[corPreenchimento])}
          style={{ width: `${percentual}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
