import { describe, expect, it } from "vitest";
import { deveAvancarParaAguardandoAprovacao } from "./etapa-esteira";

describe("deveAvancarParaAguardandoAprovacao", () => {
  it("é true para as etapas anteriores a aguardando_aprovacao", () => {
    expect(deveAvancarParaAguardandoAprovacao("novo")).toBe(true);
    expect(deveAvancarParaAguardandoAprovacao("visita_agendada")).toBe(true);
    expect(deveAvancarParaAguardandoAprovacao("projeto_3d")).toBe(true);
  });

  it("é false para aguardando_aprovacao e fechado", () => {
    expect(deveAvancarParaAguardandoAprovacao("aguardando_aprovacao")).toBe(false);
    expect(deveAvancarParaAguardandoAprovacao("fechado")).toBe(false);
  });
});
