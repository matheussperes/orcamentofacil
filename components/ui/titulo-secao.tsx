import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TracoDeCota } from "./traco-de-cota";

/**
 * Título de `section` (Design-System.md §7.2/§0.2) — `text-titulo-secao` +
 * traço de cota como divisor no lugar de uma borda inferior lisa. `action`
 * é opcional (ex.: botões de exportar alinhados à direita da mesma linha).
 */
export function TituloSecao({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-md", className)}>
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h2 className="text-titulo-secao text-cinza-900">{children}</h2>
        {action}
      </div>
      <TracoDeCota className="mt-xs" />
    </div>
  );
}
