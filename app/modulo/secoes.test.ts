import { describe, it, expect } from "vitest";
import { ordemSecoesPlaca, ROTULOS_SECOES_PLACA, _SECOES_PLACA_PARA_TESTE } from "./secoes";
import { CAPACIDADES, type Capacidade } from "@/lib/orcamento";

describe("ordemSecoesPlaca — schema CAPACIDADES é a única fonte de verdade (Task 13.1)", () => {
  it("origem 'placa' mostra as 5 seções, na ordem declarada", () => {
    expect(ordemSecoesPlaca("placa")).toEqual([
      "dimensoesMaterial",
      "orientacao",
      "bordaPorLado",
      "engrossamento",
      "ripado",
    ]);
  });

  it("origem 'custom_box' só bate com a capacidade dimensoes+material (as 4 seções específicas de Placa não aparecem)", () => {
    // custom_box também declara "dimensoes"/"material" no schema (é
    // legítimo — os dois tipos de item têm dimensões e material), então
    // "dimensoesMaterial" passa no filtro; mas nenhuma capacidade exclusiva
    // de Placa (orientacao/bordaPorLado/engrossamento/ripado) está no
    // schema de custom_box, então as outras 4 seções não aparecem.
    expect(ordemSecoesPlaca("custom_box")).toEqual(["dimensoesMaterial"]);
  });

  it("cada seção declarada só cobre capacidades presentes em CAPACIDADES.placa", () => {
    const validas = new Set(CAPACIDADES.placa);
    for (const secao of _SECOES_PLACA_PARA_TESTE) {
      for (const capacidade of secao.capacidades) {
        expect(validas.has(capacidade)).toBe(true);
      }
    }
  });

  it("se uma capacidade sair do schema, a seção correspondente some sozinha (sem editar a UI)", () => {
    const semEngrossamento: Capacidade[] = CAPACIDADES.placa.filter((c) => c !== "engrossamento");
    const capacidadesDoOrigem = new Set(semEngrossamento);
    const restantes = _SECOES_PLACA_PARA_TESTE.filter((s) =>
      s.capacidades.every((c) => capacidadesDoOrigem.has(c))
    ).map((s) => s.id);
    expect(restantes).not.toContain("engrossamento");
    expect(restantes).toHaveLength(4);
  });

  it("todo id de seção tem rótulo", () => {
    for (const secao of _SECOES_PLACA_PARA_TESTE) {
      expect(ROTULOS_SECOES_PLACA[secao.id]).toBeTruthy();
    }
  });
});
