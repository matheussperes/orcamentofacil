import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Task 13.3b — Design-System.md Seção 7.6: badge/chip de status, shadcn
// `Badge` com variantes customizadas. Pill (`rounded-full`, não `rounded-md`
// — diferente da v2), mapeamento de cor = Seção 2.5 (mapeamento canônico de
// status de orçamento, único em toda a UI: donut, chips, lista, filtros) +
// `neutro`/`sucesso-solido` (Seção 7.6, usados fora do fluxo de orçamento —
// "Global" na Biblioteca, "Ativo" no Catálogo).
//
// Nota: o banco (`orcamento.status`) só tem 4 valores reais — 'rascunho',
// 'enviado', 'aprovado', 'recusado' (ver supabase/migrations/
// 20260727090300_orcamento.sql). As variantes `em-andamento`/`fechado`
// abaixo existem porque a Seção 2.5 do Design-System as documenta como parte
// do mapeamento canônico (para quando/se esses status existirem no domínio),
// mas NENHUM consumidor desta task as usa — não inventamos esses status no
// app. `StatusOrcamentoBadge` (components/dashboard/StatusOrcamentoBadge.tsx)
// é quem decide, a partir do valor real do banco, qual variante usar.
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-[10px] py-[2px] text-legenda font-medium",
  {
    variants: {
      variant: {
        rascunho: "bg-cinza-100 text-cinza-600",
        "em-andamento": "bg-informacao-subtle text-informacao",
        enviado: "bg-accent-subtle text-accent",
        aprovado: "bg-sucesso-subtle text-sucesso",
        fechado: "bg-roxo-subtle text-roxo",
        erro: "bg-erro-subtle text-erro",
        neutro: "bg-cinza-100 text-cinza-600",
        "sucesso-solido": "bg-sucesso-subtle text-sucesso",
      },
    },
    defaultVariants: {
      variant: "neutro",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
