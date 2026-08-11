// Task 3.1/3.3 front — QA reprovou por falta de prova automatizada do
// fallback Worker/main-thread e do cancelamento (ver
// .maestro/tmp/verdicts/3.1-3.3-front-qa-engineer.md). `criarWorker` é
// injetável exatamente para isto: fake worker via `vi.fn`, sem `renderHook`
// nem DOM real — mesmo padrão de `lib/ambiente/salvar.test.ts`.
import { afterEach, describe, expect, it, vi } from "vitest";
import { calcularPlanoDeCorteAssincrono } from "./usarPlanoDeCorte";
import { planoDeCorte } from "./cutting";
import type { Peca } from "../types";

const pecas: Peca[] = [
  {
    nome: "Lateral",
    quantidade: 2,
    material_tipo: "caixa",
    cor: "Branco TX",
    espessura_mm: 15,
    altura_mm: 720,
    largura_mm: 550,
    area_m2: 0,
    fita_m: 0,
    temVeio: false,
    sentidoVeio: "comprimento",
  },
];
const kerf = 4;

/** Fake worker mínimo: postMessage/terminate espiáveis, onmessage/onerror
 * disparáveis manualmente pelo teste (sem timing real de Worker). */
function criarFakeWorker() {
  return {
    onmessage: null as ((ev: MessageEvent) => void) | null,
    onerror: null as ((ev: Event) => void) | null,
    postMessage: vi.fn(),
    terminate: vi.fn(),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("calcularPlanoDeCorteAssincrono", () => {
  it("typeof Worker === undefined: fallback main-thread com o mesmo resultado de planoDeCorte", async () => {
    vi.stubGlobal("Worker", undefined);

    const { promise } = calcularPlanoDeCorteAssincrono(pecas, kerf);
    const resultado = await promise;

    expect(resultado).toEqual(planoDeCorte(pecas, undefined, undefined, kerf));
  });

  it("criarWorker lança ao instanciar: mesmo fallback main-thread", async () => {
    vi.stubGlobal("Worker", class {});
    const criarWorker = () => {
      throw new Error("instanciação falhou");
    };

    const { promise } = calcularPlanoDeCorteAssincrono(pecas, kerf, criarWorker);
    const resultado = await promise;

    expect(resultado).toEqual(planoDeCorte(pecas, undefined, undefined, kerf));
  });

  it("worker feliz: onmessage disparado manualmente resolve a promise com esse payload", async () => {
    vi.stubGlobal("Worker", class {});
    const fakeWorker = criarFakeWorker();
    const criarWorker = () => fakeWorker as unknown as Worker;

    const { promise } = calcularPlanoDeCorteAssincrono(pecas, kerf, criarWorker);

    expect(fakeWorker.postMessage).toHaveBeenCalledWith({ pecas, kerf });
    const payloadFake = planoDeCorte(pecas, undefined, undefined, kerf);
    fakeWorker.onmessage?.({ data: payloadFake } as MessageEvent);

    await expect(promise).resolves.toEqual(payloadFake);
  });

  it("worker com erro: onerror disparado cai no fallback main-thread", async () => {
    vi.stubGlobal("Worker", class {});
    const fakeWorker = criarFakeWorker();
    const criarWorker = () => fakeWorker as unknown as Worker;

    const { promise } = calcularPlanoDeCorteAssincrono(pecas, kerf, criarWorker);
    fakeWorker.onerror?.(new Event("error"));
    const resultado = await promise;

    expect(resultado).toEqual(planoDeCorte(pecas, undefined, undefined, kerf));
  });

  it("cancelar(): chama terminate() no worker em voo", () => {
    vi.stubGlobal("Worker", class {});
    const fakeWorker = criarFakeWorker();
    const criarWorker = () => fakeWorker as unknown as Worker;

    const { cancelar } = calcularPlanoDeCorteAssincrono(pecas, kerf, criarWorker);
    cancelar();

    expect(fakeWorker.terminate).toHaveBeenCalledTimes(1);
  });

  it("cancelar(): chama clearTimeout no timeout do fallback main-thread", () => {
    vi.stubGlobal("Worker", undefined);
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const { cancelar } = calcularPlanoDeCorteAssincrono(pecas, kerf);
    cancelar();

    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
  });
});
