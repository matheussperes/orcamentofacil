// Conjunto físico (Modelo de Domínio, Seção 3.3; briefing 6.2/6.3) — bloco de
// itens adjacentes na mesma parede/faixa, detectado automaticamente e
// ajustável por override manual ("handle de junção" na elevação). Base para
// Elemento Contínuo (tampo/rodapé/tamponamento/fechamento, Seção 3.4/3.5),
// fora do escopo desta task.

import type { Faixa } from "../parede/types";

export interface Conjunto {
  id: string;
  paredeId: string;
  faixa: Faixa;
  // Ordenados por x — itens adjacentes, mesma faixa, bordas encostadas (ou
  // um único item, quando ele não se junta a nenhum vizinho — ver decisão de
  // design em detectar.ts sobre incluir conjuntos de 1 item).
  itensIds: string[];
}

// Estado do "handle de junção" (briefing 6.2) entre DOIS itens especificamente
// — não o Conjunto inteiro. Representa a ação do usuário de forçar ou romper
// a junção entre um par de itens, sobrepondo a detecção automática:
//   "quebrado" → remove uma junção que a detecção automática faria (pode
//                partir um Conjunto grande em Conjuntos menores).
//   "unido"    → força uma junção que a detecção automática NÃO faria (vão
//                maior que a tolerância, ou elemento de parede bloqueante
//                entre os dois itens).
// Persistência do override não é escopo desta task (Task 11.2 não criou
// tabela `conjunto` — decisão de Fase C futura). Aqui é só o dado de entrada
// da função pura `aplicarOverrides`.
export interface OverrideJuncao {
  itemIdA: string;
  itemIdB: string;
  forcar: "unido" | "quebrado";
}
