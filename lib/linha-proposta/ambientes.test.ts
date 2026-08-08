import { describe, expect, it } from "vitest";
import { ambientesDaLinha } from "./ambientes";
import type { AmbienteItem } from "@/lib/ambiente/estado";

function ambiente(id: string, nome: string, itemIds: string[]): AmbienteItem {
  return {
    id,
    nome,
    ordem: 0,
    paredes: [
      {
        id: `${id}-parede-1`,
        nome: "Parede 1",
        ordem: 0,
        largura: 3000,
        altura: 2700,
        elementos: [],
        itens: itemIds.map((itemId) => ({ itemId, x: 0, faixa: "inferior" as const })),
      },
    ],
  };
}

describe("ambientesDaLinha", () => {
  it("retorna o nome do único ambiente cujas paredes contêm os itens da linha", () => {
    const ambientes = [ambiente("a1", "Quarto", ["item-1", "item-2"]), ambiente("a2", "Sala", ["item-3"])];
    expect(ambientesDaLinha(["item-1", "item-2"], ambientes)).toEqual(["Quarto"]);
  });

  it("linha sem itens retorna array vazio", () => {
    const ambientes = [ambiente("a1", "Quarto", ["item-1"])];
    expect(ambientesDaLinha([], ambientes)).toEqual([]);
  });

  it("linha cruzando 2 ambientes retorna os dois nomes, na ordem de `ambientes`", () => {
    const ambientes = [ambiente("a1", "Quarto", ["item-1"]), ambiente("a2", "Sala", ["item-2"])];
    expect(ambientesDaLinha(["item-1", "item-2"], ambientes)).toEqual(["Quarto", "Sala"]);
  });

  it("ignora itemId que não resolve pra nenhuma parede, sem quebrar", () => {
    const ambientes = [ambiente("a1", "Quarto", ["item-1"])];
    expect(ambientesDaLinha(["item-1", "item-orfao"], ambientes)).toEqual(["Quarto"]);
  });
});
