// Task 3.1/3.3 (front, Modelo-de-Dominio.md §8.3 "Web Worker — o que muda") —
// Web Worker que roda a busca completa (`planoDeCorte`, simulated annealing,
// 1–2s) fora da main thread. 100% burro: recebe a entrada, chama a MESMA
// função pura do motor (`lib/engine/box/cutting.ts`, algoritmo fechado na
// Task 3.1/3.3 motor) e devolve o resultado — nenhuma lógica de domínio aqui.
// Instanciado por `usarPlanoDeCorte.ts`, nunca diretamente pelos componentes.
import { planoDeCorte, type GrupoChapas } from "./cutting";
import type { Peca } from "../types";

export interface MensagemEntradaPlanoDeCorte {
  pecas: Peca[];
  kerf: number;
}

// `self` dentro de um Worker é `DedicatedWorkerGlobalScope`, não `Window` —
// o tsconfig do projeto só inclui a lib "dom" (sem "webworker", que colidiria
// com ela). O cast local evita puxar essa lib pro projeto inteiro só por
// causa deste arquivo.
const contexto = self as unknown as Worker;

contexto.onmessage = (evento: MessageEvent<MensagemEntradaPlanoDeCorte>) => {
  const { pecas, kerf } = evento.data;
  const grupos: GrupoChapas[] = planoDeCorte(pecas, undefined, undefined, kerf);
  contexto.postMessage(grupos);
};
