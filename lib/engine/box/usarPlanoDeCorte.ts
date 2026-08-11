"use client";

import { useEffect, useState } from "react";
import {
  planoDeCorte,
  planoDeCorteEstimativa,
  type GrupoChapas,
} from "./cutting";
import type { Peca } from "../types";
import type { MensagemEntradaPlanoDeCorte } from "./cutting.worker";

export interface ResultadoPlanoDeCorte {
  grupos: GrupoChapas[];
  /** `true` enquanto a busca completa (Worker, ou main thread se Worker
   * indisponível) ainda não devolveu — `grupos` já é a estimativa
   * determinística nesse meio-tempo, nunca uma tela vazia. */
  calculando: boolean;
}

export interface OperacaoPlanoDeCorte {
  promise: Promise<GrupoChapas[]>;
  /** Encerra o Worker em voo (ou cancela o fallback agendado) — chamado no
   * cleanup do efeito quando `pecas`/`kerf` mudam de novo ou o componente
   * desmonta antes da busca completa terminar. */
  cancelar: () => void;
}

function criarWorkerPadrao(): Worker {
  return new Worker(new URL("./cutting.worker.ts", import.meta.url));
}

/**
 * Task 3.1/3.3 (front, Modelo-de-Dominio.md §8.3 "Web Worker — o que muda") —
 * roda a busca completa (`planoDeCorte`) no Web Worker do navegador; se
 * `Worker` não existir (`typeof Worker === "undefined"`) ou falhar ao
 * instanciar/rodar, roda a MESMA função no main thread — resultado idêntico,
 * só mais lento. `criarWorker` é injetável só para teste (evita depender de
 * timing de Worker real — o teste troca o global `Worker` e injeta um fake).
 */
export function calcularPlanoDeCorteAssincrono(
  pecas: Peca[],
  kerf: number,
  criarWorker: () => Worker = criarWorkerPadrao
): OperacaoPlanoDeCorte {
  let worker: Worker | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const promise = new Promise<GrupoChapas[]>((resolve) => {
    // Adiado (macrotask) para não bloquear o paint da estimativa já em tela —
    // rodar a busca completa síncrona na mesma tarefa anularia o ganho de
    // "estimativa aparece de imediato" (o fallback já é sabidamente mais
    // lento e trava a UI por 1–2s, conforme o Modelo de Domínio; o que não
    // pode acontecer é ele travar ANTES da estimativa pintar).
    function rodarNoMainThread() {
      timeoutId = setTimeout(() => resolve(planoDeCorte(pecas, undefined, undefined, kerf)), 0);
    }

    if (typeof Worker === "undefined") {
      rodarNoMainThread();
      return;
    }

    try {
      worker = criarWorker();
    } catch {
      rodarNoMainThread();
      return;
    }

    worker.onmessage = (evento: MessageEvent<GrupoChapas[]>) => resolve(evento.data);
    // Falha ao RODAR no Worker (não só ao instanciar) — mesmo fallback,
    // mesma função, resultado idêntico (contrato).
    worker.onerror = () => rodarNoMainThread();

    const mensagem: MensagemEntradaPlanoDeCorte = { pecas, kerf };
    worker.postMessage(mensagem);
  });

  function cancelar() {
    worker?.terminate();
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }

  return { promise, cancelar };
}

/**
 * Abstrai `calcularPlanoDeCorteAssincrono` + o estado transitório de UI
 * `calculando → pronto` para os dois call sites reais de `planoDeCorte`
 * (`CorteMaterialLab`, `EditorItemNucleo`). Nenhuma infraestrutura nova (sem
 * job, fila, hash de entrada, cache entre chamadas) — cada mudança de
 * `pecas`/`kerf` recalcula do zero.
 */
export function usarPlanoDeCorte(pecas: Peca[], kerf = 0): ResultadoPlanoDeCorte {
  const [grupos, setGrupos] = useState<GrupoChapas[]>(() =>
    planoDeCorteEstimativa(pecas, undefined, undefined, kerf)
  );
  const [calculando, setCalculando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setGrupos(planoDeCorteEstimativa(pecas, undefined, undefined, kerf));
    setCalculando(true);

    const operacao = calcularPlanoDeCorteAssincrono(pecas, kerf);
    operacao.promise.then((resultado) => {
      if (cancelado) return;
      setGrupos(resultado);
      setCalculando(false);
    });

    return () => {
      cancelado = true;
      operacao.cancelar();
    };
  }, [pecas, kerf]);

  return { grupos, calculando };
}
