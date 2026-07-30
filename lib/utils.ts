import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// `tailwind-merge` não lê `tailwind.config.ts` — ele só conhece a escala
// default de `fontSize` do Tailwind. Sem esta configuração, os 7 tokens
// customizados de tipografia (Seção 3 do Design System: `display`,
// `titulo-secao`, `titulo-card`, `corpo`, `corpo-pequeno`, `legenda`,
// `valor-destaque`) não batem com nenhum validador do classGroup
// `font-size` e caem no catch-all do classGroup `text-color` (que aceita
// qualquer valor após `text-`). Isso faz `twMerge` tratar `text-legenda` e
// `text-cinza-600` como conflitantes entre si — e descartar silenciosamente
// o que vier primeiro na string. Ver Task 7.1b em docs/Backlog.md.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "titulo-secao",
            "titulo-card",
            "corpo",
            "corpo-pequeno",
            "legenda",
            "valor-destaque",
            "valor-destaque-lg",
          ],
        },
      ],
    },
  },
});

/**
 * Combina classes Tailwind com merge de conflitos (clsx + tailwind-merge).
 * Usada por todo componente shadcn/ui gerado em `components/ui`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
