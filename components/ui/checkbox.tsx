import * as React from "react";

import { cn } from "@/lib/utils";

// Task 13.5 (contrato .maestro/tmp/13.5-contract.md) — primeiro consumo de
// checkbox no app. Implementado como `<input type="checkbox">` nativo
// estilizado (sem `@radix-ui/react-checkbox`, que não estava em
// `package.json`) — mesma decisão já tomada em `components/ui/progress.tsx`
// (Task 13.4) para `Progress`: nenhum uso previsto precisa de comportamento
// extra (indeterminate, animação) que só o Radix daria. Se um uso futuro
// precisar, trocar a implementação é decisão futura, não um problema desta
// task.
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className={cn(
          "h-4 w-4 shrink-0 rounded border-cinza-300 text-accent focus:ring-2 focus:ring-accent focus:ring-offset-1",
          className
        )}
        {...props}
      />
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
