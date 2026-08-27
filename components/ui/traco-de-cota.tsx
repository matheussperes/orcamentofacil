import { cn } from "@/lib/utils";

/**
 * Design-System.md §0.2 — decisão assinatura "traço de cota" (dimension
 * line): a mesma forma da régua com ticks (§9.3) e da seta de sentido de
 * veio (§9.4) do canvas técnico, generalizada como divisor de interface —
 * `⊢───⊣`, linha fina `1.5px` terminada em pequenos traços perpendiculares
 * nas duas pontas. Usado sob `text-titulo-secao` de cada `section` no lugar
 * de uma borda inferior lisa (Screen-Composition.md — Orçamento, "Assinatura").
 */
export function TracoDeCota({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("h-2 w-full text-cinza-200", className)}
    >
      <line x1="0" y1="1" x2="0" y2="7" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <line x1="0" y1="4" x2="100" y2="4" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <line x1="100" y1="1" x2="100" y2="7" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
