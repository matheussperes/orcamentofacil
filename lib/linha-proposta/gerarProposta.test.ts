import { describe, expect, it, vi } from "vitest";
import { gerarProposta } from "./gerarProposta";

describe("gerarProposta (Modelo-de-Dominio.md 5.4.1, invariante I1/I2)", () => {
  it("todas as linhas gravam com sucesso: congela DEPOIS, na ordem certa", async () => {
    const chamadas: string[] = [];
    const onAtualizarLinha = vi.fn(async (id: string) => {
      chamadas.push(`linha:${id}`);
      return { ok: true };
    });
    const onCongelarOrcamento = vi.fn(async (orcamentoId: string) => {
      chamadas.push(`congelar:${orcamentoId}`);
      return { ok: true };
    });

    const resultado = await gerarProposta({
      orcamentoId: "orc-1",
      linhas: [
        { id: "l1", valorRateado: 100 },
        { id: "l2", valorRateado: 200 },
      ],
      onAtualizarLinha,
      onCongelarOrcamento,
    });

    expect(resultado).toEqual({ ok: true });
    expect(onAtualizarLinha).toHaveBeenCalledTimes(2);
    expect(onAtualizarLinha).toHaveBeenCalledWith("l1", { valorRateado: 100 });
    expect(onAtualizarLinha).toHaveBeenCalledWith("l2", { valorRateado: 200 });
    expect(onCongelarOrcamento).toHaveBeenCalledTimes(1);
    expect(onCongelarOrcamento).toHaveBeenCalledWith("orc-1");
    // congelar só depois que TODAS as linhas já tiverem gravado.
    expect(chamadas.indexOf("congelar:orc-1")).toBe(2);
  });

  it("uma linha falha: não chama congelarOrcamento e devolve o erro", async () => {
    const onAtualizarLinha = vi.fn(async (id: string) => {
      if (id === "l2") return { ok: false, erro: "falha ao gravar l2" };
      return { ok: true };
    });
    const onCongelarOrcamento = vi.fn(async () => ({ ok: true }));

    const resultado = await gerarProposta({
      orcamentoId: "orc-1",
      linhas: [
        { id: "l1", valorRateado: 100 },
        { id: "l2", valorRateado: 200 },
      ],
      onAtualizarLinha,
      onCongelarOrcamento,
    });

    expect(resultado).toEqual({ ok: false, erro: "falha ao gravar l2" });
    expect(onCongelarOrcamento).not.toHaveBeenCalled();
  });

  it("congelarOrcamento falha depois de todas as linhas terem gravado: devolve o erro sem navegar (I1/I2)", async () => {
    const onAtualizarLinha = vi.fn(async () => ({ ok: true }));
    const onCongelarOrcamento = vi.fn(async () => ({ ok: false, erro: "não foi possível congelar" }));

    const resultado = await gerarProposta({
      orcamentoId: "orc-1",
      linhas: [{ id: "l1", valorRateado: 100 }],
      onAtualizarLinha,
      onCongelarOrcamento,
    });

    expect(resultado).toEqual({ ok: false, erro: "não foi possível congelar" });
    expect(onAtualizarLinha).toHaveBeenCalledTimes(1);
    expect(onCongelarOrcamento).toHaveBeenCalledTimes(1);
    expect(onCongelarOrcamento).toHaveBeenCalledWith("orc-1");
  });
});
