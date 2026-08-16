import { describe, it, expect } from "vitest";
import { rotuloDoCard } from "./StatusOrcamentoBadge";

// Task 5.10-front (Modelo-de-Dominio.md Seção 7.2, Q-15) — cobre os 3 ramos
// da tabela de decisão de `rotuloDoCard`, sem desvio.
describe("rotuloDoCard", () => {
  it("etapaEsteira 'fechado' → sempre 'Fechado', independente do status", () => {
    expect(rotuloDoCard("rascunho", "fechado")).toEqual({ rotulo: "Fechado", variante: "fechado" });
    expect(rotuloDoCard("aprovado", "fechado")).toEqual({ rotulo: "Fechado", variante: "fechado" });
  });

  it("etapas não-terminais (visita_agendada, projeto_3d, aguardando_aprovacao) → 'Em andamento'", () => {
    expect(rotuloDoCard("rascunho", "visita_agendada")).toEqual({ rotulo: "Em andamento", variante: "em-andamento" });
    expect(rotuloDoCard("enviado", "projeto_3d")).toEqual({ rotulo: "Em andamento", variante: "em-andamento" });
    expect(rotuloDoCard("aprovado", "aguardando_aprovacao")).toEqual({ rotulo: "Em andamento", variante: "em-andamento" });
  });

  it("etapaEsteira 'novo' → rótulo do status comercial, para os 4 status", () => {
    expect(rotuloDoCard("rascunho", "novo")).toEqual({ rotulo: "Rascunho", variante: "rascunho" });
    expect(rotuloDoCard("enviado", "novo")).toEqual({ rotulo: "Enviado", variante: "enviado" });
    expect(rotuloDoCard("aprovado", "novo")).toEqual({ rotulo: "Aprovado", variante: "aprovado" });
    expect(rotuloDoCard("recusado", "novo")).toEqual({ rotulo: "Recusado", variante: "erro" });
  });
});
