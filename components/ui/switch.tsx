import * as React from "react";

import { cn } from "@/lib/utils";

// Task 3.2 — mesmo espírito de components/ui/checkbox.tsx (Task 13.5):
// `@radix-ui/react-switch` não está em package.json e nenhum uso previsto
// precisa do comportamento extra do Radix — implementado como
// <button role="switch"> nativo estilizado, tokens de Design-System.md
// Seção 7.10 (track off `bg-cinza-300`, track on `bg-accent`, thumb
// `bg-cinza-0 shadow-sm` 20px, transição `duration-120`).
export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors duration-120 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-accent" : "bg-cinza-300",
          className
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          className={cn(
            "h-5 w-5 rounded-full bg-cinza-0 shadow-sm transition-transform duration-120",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    );
  }
);
Switch.displayName = "Switch";

export { Switch };
