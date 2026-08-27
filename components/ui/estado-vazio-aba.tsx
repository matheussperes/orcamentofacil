import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Task R.5a — Design-System.md §8 (estado "vazio"): ícone 32px `cinza-300`
 * centralizado + título `text-titulo-card text-cinza-700` + descrição
 * `text-corpo-pequeno text-cinza-500` + ação opcional. Screen-Composition.md
 * (Orçamento, "Vazio e erro") lista nominalmente "parede sem itens
 * posicionados", "plano de corte sem chapas calculadas" e "linhas de
 * proposta antes de 'Adicionar linha'" como o MESMO tratamento — peça única
 * reaproveitada pelas 4 abas em vez de cada uma reimplementar o bloco.
 *
 * `className` permite a variante "embutida" (sem moldura própria) para um
 * vazio que já vive dentro de outro `Card`/`section` com borda — evita duas
 * bordas competindo pela mesma informação.
 */
export function EstadoVazioAba({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-sm rounded-lg border border-cinza-200 bg-cinza-0 p-xl py-3xl text-center shadow-xs",
        className
      )}
    >
      <Icone className="h-8 w-8 text-cinza-300" aria-hidden="true" />
      <h2 className="text-titulo-card text-cinza-700">{titulo}</h2>
      <p className="max-w-sm text-corpo-pequeno text-cinza-500">{descricao}</p>
      {acao}
    </div>
  );
}
