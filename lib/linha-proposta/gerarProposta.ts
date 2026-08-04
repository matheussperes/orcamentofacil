export interface ResultadoGerarProposta {
  ok: boolean;
  erro?: string;
}

// Task 0.7b (Modelo-de-Dominio.md 5.4.1, invariante I1/I2) — extraído de
// `PropostaLab.tsx::handleGerarProposta` pelo mesmo motivo de
// `valorAtual.ts`: testável sem infra de renderização. Garante a ordem
// atômica exigida — `congelarOrcamento` só é chamado DEPOIS que todas as
// `linha_proposta` tiverem `valorRateado` persistido com sucesso; falha em
// qualquer uma das duas etapas interrompe o fluxo sem congelar o orçamento.
export async function gerarProposta(params: {
  orcamentoId: string;
  linhas: { id: string; valorRateado: number }[];
  onAtualizarLinha: (id: string, patch: { valorRateado: number }) => Promise<{ ok: boolean; erro?: string }>;
  onCongelarOrcamento: (orcamentoId: string) => Promise<{ ok: boolean; erro?: string }>;
}): Promise<ResultadoGerarProposta> {
  const resultadosLinhas = await Promise.all(
    params.linhas.map((l) => params.onAtualizarLinha(l.id, { valorRateado: l.valorRateado }))
  );
  const falhouLinha = resultadosLinhas.find((r) => !r.ok);
  if (falhouLinha) {
    return {
      ok: false,
      erro: falhouLinha.erro ?? "Não foi possível congelar os valores da proposta. Tente novamente.",
    };
  }

  const resultadoCongelar = await params.onCongelarOrcamento(params.orcamentoId);
  if (!resultadoCongelar.ok) {
    return {
      ok: false,
      erro: resultadoCongelar.erro ?? "Não foi possível congelar o orçamento. Tente novamente.",
    };
  }

  return { ok: true };
}
