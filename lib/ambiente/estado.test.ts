// Task 2.3-2.6 — testes puros de `aplicarComandoAmbiente` (CRUD imediato de
// ambiente/parede EM MEMÓRIA, usado por `AmbientesLab` quando não há
// `onMutarAmbientes` — harness/laboratório sem Supabase real). O caminho
// Supabase real (`onMutarAmbientes` → `lib/ambiente/mutar.ts` →
// `lib/ambiente/acoes.ts`) já é coberto por `lib/ambiente/acoes.test.ts`.
import { describe, expect, it } from "vitest";
import { aplicarComandoAmbiente, estadoAmbientePadrao, type AmbienteItem } from "./estado";

function gerarIdSequencial(): () => string {
  let n = 0;
  return () => `gerado-${++n}`;
}

describe("aplicarComandoAmbiente", () => {
  it("estado padrão nasce com 1 ambiente e 1 parede", () => {
    const estado = estadoAmbientePadrao();
    expect(estado.ambientes).toHaveLength(1);
    expect(estado.ambientes[0].paredes).toHaveLength(1);
  });

  it("criarAmbiente adiciona ao final, já com 1 parede default", () => {
    const base = estadoAmbientePadrao().ambientes;
    const resultado = aplicarComandoAmbiente(base, { tipo: "criarAmbiente", nome: "Cozinha" }, gerarIdSequencial());

    expect(resultado).toHaveLength(2);
    expect(resultado[1].nome).toBe("Cozinha");
    expect(resultado[1].paredes).toHaveLength(1);
  });

  it("renomearAmbiente altera só o ambiente alvo", () => {
    const base = estadoAmbientePadrao().ambientes;
    const resultado = aplicarComandoAmbiente(
      base,
      { tipo: "renomearAmbiente", ambienteId: base[0].id, nome: "Sala" },
      gerarIdSequencial()
    );
    expect(resultado[0].nome).toBe("Sala");
  });

  it("excluirAmbiente remove o ambiente e suas paredes (cascata implícita — array de paredes some junto)", () => {
    const gerarId = gerarIdSequencial();
    const comDois = aplicarComandoAmbiente(estadoAmbientePadrao().ambientes, { tipo: "criarAmbiente", nome: "Cozinha" }, gerarId);
    const resultado = aplicarComandoAmbiente(comDois, { tipo: "excluirAmbiente", ambienteId: comDois[0].id }, gerarId);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].nome).toBe("Cozinha");
  });

  it("reordenarAmbientes aplica a nova ordem informada", () => {
    const gerarId = gerarIdSequencial();
    const comDois = aplicarComandoAmbiente(estadoAmbientePadrao().ambientes, { tipo: "criarAmbiente", nome: "Cozinha" }, gerarId);
    const [primeiro, segundo] = comDois;
    const resultado = aplicarComandoAmbiente(
      comDois,
      { tipo: "reordenarAmbientes", idsNaNovaOrdem: [segundo.id, primeiro.id] },
      gerarId
    );

    expect(resultado.map((a) => a.id)).toEqual([segundo.id, primeiro.id]);
    expect(resultado[0].ordem).toBe(0);
    expect(resultado[1].ordem).toBe(1);
  });

  it("criarParede adiciona parede ao ambiente certo, sem afetar os demais", () => {
    const gerarId = gerarIdSequencial();
    const comDois = aplicarComandoAmbiente(estadoAmbientePadrao().ambientes, { tipo: "criarAmbiente", nome: "Cozinha" }, gerarId);
    const resultado = aplicarComandoAmbiente(
      comDois,
      { tipo: "criarParede", ambienteId: comDois[1].id, nome: "Parede 2" },
      gerarId
    );

    expect(resultado[0].paredes).toHaveLength(1);
    expect(resultado[1].paredes).toHaveLength(2);
    expect(resultado[1].paredes[1].nome).toBe("Parede 2");
  });

  it("renomearParede/excluirParede afetam só a parede alvo, buscando em todos os ambientes", () => {
    const gerarId = gerarIdSequencial();
    const base = estadoAmbientePadrao().ambientes;
    const paredeId = base[0].paredes[0].id;

    const renomeado = aplicarComandoAmbiente(base, { tipo: "renomearParede", paredeId, nome: "Cozinha Norte" }, gerarId);
    expect(renomeado[0].paredes[0].nome).toBe("Cozinha Norte");

    const comSegundaParede = aplicarComandoAmbiente(
      renomeado,
      { tipo: "criarParede", ambienteId: renomeado[0].id, nome: "Parede 2" },
      gerarId
    );
    const excluido = aplicarComandoAmbiente(
      comSegundaParede,
      { tipo: "excluirParede", paredeId },
      gerarId
    );
    expect(excluido[0].paredes).toHaveLength(1);
    expect(excluido[0].paredes[0].nome).toBe("Parede 2");
  });

  it("reordenarParedes só reordena as paredes do ambiente informado", () => {
    const gerarId = gerarIdSequencial();
    const comSegundaParede = aplicarComandoAmbiente(
      estadoAmbientePadrao().ambientes,
      { tipo: "criarParede", ambienteId: estadoAmbientePadrao().ambientes[0].id, nome: "Parede 2" },
      gerarId
    );
    // `criarParede` acima usou um `ambienteId` de uma chamada AVULSA de
    // `estadoAmbientePadrao()` (mesmo id sentinela `AMBIENTE_PADRAO_ID`),
    // então ainda bate com `comSegundaParede[0].id` — ver `estado.ts`.
    const ambienteId = comSegundaParede[0].id;
    const [p1, p2] = comSegundaParede[0].paredes;

    const resultado = aplicarComandoAmbiente(
      comSegundaParede,
      { tipo: "reordenarParedes", ambienteId, idsNaNovaOrdem: [p2.id, p1.id] },
      gerarId
    );

    expect(resultado[0].paredes.map((p) => p.id)).toEqual([p2.id, p1.id]);
  });
});
