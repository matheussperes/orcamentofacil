// Task 3.2 — mesmo espírito de CorteMaterialLab.test.ts (Task 3.8 front):
// `environment: "node"`, só a lógica pura extraída do componente com canvas
// nativo (sem jsdom/canvas real).
import { describe, expect, it } from "vitest";
import { deveDesenharSetaDeVeio } from "./PlanoCorteCanvas";

describe("deveDesenharSetaDeVeio", () => {
  it("toggle desligado nunca desenha, mesmo com temVeio", () => {
    expect(deveDesenharSetaDeVeio(false, true)).toBe(false);
  });

  it("toggle ligado e temVeio: false não desenha", () => {
    expect(deveDesenharSetaDeVeio(true, false)).toBe(false);
  });

  it("toggle ligado e temVeio: true desenha", () => {
    expect(deveDesenharSetaDeVeio(true, true)).toBe(true);
  });

  it("toggle desligado e temVeio: false não desenha", () => {
    expect(deveDesenharSetaDeVeio(false, false)).toBe(false);
  });
});
