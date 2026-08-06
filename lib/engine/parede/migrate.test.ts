import { describe, expect, it } from "vitest";
import { migrarElementoParede } from "./migrate";
import type { ElementoParede } from "./types";

describe("migrarElementoParede", () => {
  it("elemento legado (sem id/refX/refY) ganha id gerado, refX 'esquerda', refY 'chao', sem alterar x/y/largura/altura/tipo", () => {
    const legado = {
      tipo: "janela",
      x: 200,
      y: 900,
      largura: 800,
      altura: 1000,
    } as unknown as ElementoParede;

    const migrado = migrarElementoParede(legado);

    expect(migrado.tipo).toBe("janela");
    expect(migrado.x).toBe(200);
    expect(migrado.y).toBe(900);
    expect(migrado.largura).toBe(800);
    expect(migrado.altura).toBe(1000);
    expect(migrado.refX).toBe("esquerda");
    expect(migrado.refY).toBe("chao");
    expect(typeof migrado.id).toBe("string");
    expect(migrado.id.length).toBeGreaterThan(0);
  });

  it("é idempotente: elemento já no formato novo passa direto, sem trocar o id", () => {
    const novo: ElementoParede = {
      id: "elemento-1",
      tipo: "porta",
      nome: "Porta da sala",
      x: 0,
      y: 0,
      largura: 800,
      altura: 2100,
      refX: "direita",
      refY: "teto",
    };

    expect(migrarElementoParede(novo)).toEqual(novo);
  });
});
