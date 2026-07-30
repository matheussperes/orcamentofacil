import { describe, expect, it } from "vitest";
import { resolverAlvoElemento } from "./resolverAlvo";
import type { ResolvedorItens } from "@/lib/engine/parede";
import type { Conjunto } from "@/lib/engine/conjunto";
import type { ElementoContinuo } from "@/lib/engine/elemento-continuo/types";
import type { ModuloOrcamento } from "@/lib/orcamento";
import type { Placa } from "@/lib/engine/placa/types";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — cobertura da função
// extraída de `components/ambientes/AmbientesLab.tsx` (Task 13.2c). Mesmos
// casos que a Task 13.2c já validava manualmente via UI: tampo/rodapé/
// fechamento somam os itens de um Conjunto ou de um módulo isolado;
// tamponamento sempre mira UM módulo (a extremidade); alvo removido -> null.

const MATERIAL = { cor: "Branco TX", espessura: 15 };

function placaItem(id: string, largura: number, altura = 700): ModuloOrcamento {
  const placa: Placa = {
    id,
    nome: `Item ${id}`,
    largura,
    altura,
    material: MATERIAL,
    orientacao: "horizontal",
  };
  return { origem: "placa", placa };
}

function mapaItens(...itens: ModuloOrcamento[]): ResolvedorItens {
  const m = new Map<string, ModuloOrcamento>();
  for (const item of itens) {
    const id = item.origem === "custom_box" ? item.box.id : item.placa.id;
    m.set(id, item);
  }
  return m;
}

function elementoBase(overrides: Partial<ElementoContinuo> = {}): ElementoContinuo {
  return {
    id: "elemento-1",
    tipo: "tampo",
    alvo: { moduloId: "a" },
    posicao: "superior",
    material: MATERIAL,
    ...overrides,
  };
}

describe("resolverAlvoElemento", () => {
  it("módulo isolado -> { itens: [um módulo] }", () => {
    const resolvedor = mapaItens(placaItem("a", 600, 700));
    const alvo = resolverAlvoElemento(elementoBase({ alvo: { moduloId: "a" } }), resolvedor, []);
    expect(alvo).toEqual({ itens: [{ largura: 600, profundidade: 15, altura: 700 }] });
  });

  it("conjuntoId -> { itens: [todos os módulos do bloco] }", () => {
    const resolvedor = mapaItens(placaItem("a", 600), placaItem("b", 400));
    const conjuntos: Conjunto[] = [{ id: "c1", paredeId: "parede-1", faixa: "inferior", itensIds: ["a", "b"] }];
    const alvo = resolverAlvoElemento(
      elementoBase({ tipo: "rodape", alvo: { conjuntoId: "c1" }, posicao: "base" }),
      resolvedor,
      conjuntos
    );
    expect(alvo).toEqual({
      itens: [
        { largura: 600, profundidade: 15, altura: 700 },
        { largura: 400, profundidade: 15, altura: 700 },
      ],
    });
  });

  it("tamponamento sempre mira o módulo (nunca o bloco), mesmo com alvo de conjunto implícito", () => {
    const resolvedor = mapaItens(placaItem("a", 600));
    const alvo = resolverAlvoElemento(
      elementoBase({ tipo: "tamponamento", alvo: { moduloId: "a" }, posicao: "esquerda" }),
      resolvedor,
      []
    );
    expect(alvo).toEqual({ moduloExtremidade: { largura: 600, profundidade: 15, altura: 700 } });
  });

  it("alvo removido (módulo não existe mais no resolvedor) -> null", () => {
    const resolvedor = mapaItens();
    expect(resolverAlvoElemento(elementoBase({ alvo: { moduloId: "fantasma" } }), resolvedor, [])).toBeNull();
  });

  it("conjuntoId inexistente -> null (nenhum item resolvido)", () => {
    const resolvedor = mapaItens(placaItem("a", 600));
    const alvo = resolverAlvoElemento(elementoBase({ alvo: { conjuntoId: "inexistente" } }), resolvedor, []);
    expect(alvo).toBeNull();
  });
});
