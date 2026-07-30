"use client";

import { createContext, useContext } from "react";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — mesmo espírito de
// `components/shell/PageHeaderContext.tsx` (Task 13.3c): um mecanismo mínimo
// para um Client Component QUALQUER dentro de uma aba de `OrcamentoAbas`
// pedir a troca para outra aba, sem `OrcamentoAbas` precisar conhecer quem
// está pedindo. Motivo concreto desta task: o estado "vazio" do plano de
// corte (Design-System Seção 8 — "oferecem a ação para preencher") precisa
// de um botão "Ir para Ambientes" quando o orçamento ainda não tem nenhum
// item posicionado; sem este contexto, `CorteMaterialLab` não teria como
// mudar a aba ativa (as abas são conteúdo IRMÃO, cada uma um slot recebido
// de fora — ver comentário de `OrcamentoAbas.tsx`).
//
// `OrcamentoAbas` é o único Provider (`Tabs` controlado). Fora dele, `null`
// — `useIrParaAba` devolve uma função no-op nesse caso (ex.: se algum dia um
// destes componentes for renderizado fora do shell de abas) em vez de
// lançar, porque o botão de "ir para aba" é uma melhoria de navegação, não
// uma dependência crítica de dado.
const AbaAtivaContext = createContext<((aba: string) => void) | null>(null);

export const AbaAtivaProvider = AbaAtivaContext.Provider;

export function useIrParaAba(): (aba: string) => void {
  const ctx = useContext(AbaAtivaContext);
  return ctx ?? (() => {});
}
