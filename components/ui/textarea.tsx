import * as React from "react"

import { cn } from "@/lib/utils"

// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — primeiro consumo de
// textarea no app (descrição da Linha de Proposta). `docs/Design-System.md`
// Seção 7.9 não distingue Input/Textarea (ambos "campo de formulário",
// mesmos tokens de borda/foco/erro) — implementado como `<textarea>` nativo
// com EXATAMENTE as mesmas classes de `components/ui/input.tsx` (só trocando
// `h-9` de single-line por `py-2`, e removendo os utilitários específicos de
// `<input>` — `file:*`). Mesma decisão já tomada para `Checkbox`/`Progress`
// (Tasks 13.4/13.5): sem primitivo shadcn/Radix dedicado disponível,
// componente nativo estilizado pelos tokens do Design System.
//
// Altura: em vez de um `min-h-[Npx]` arbitrário (proibido — nenhum token do
// Design System especifica altura de textarea), a altura vem do atributo
// HTML nativo `rows` (default 3, sobrescrevível pelo caller) — mecanismo
// padrão do navegador, não um valor mágico de CSS.
const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, rows = 3, ...props }, ref) => {
    return (
      <textarea
        rows={rows}
        className={cn(
          "flex w-full rounded-sm border border-cinza-300 bg-cinza-0 px-[10px] py-2 text-corpo text-cinza-900 shadow-none transition-colors placeholder:text-cinza-400 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-subtle disabled:cursor-not-allowed disabled:border-cinza-200 disabled:bg-cinza-100 disabled:text-cinza-400",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
