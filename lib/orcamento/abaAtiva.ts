// Task 1.1–1.3 (contrato .maestro/tmp/1.1-1.3-contract.md) — lógica pura de
// validação da aba ativa de `/orcamento/[id]`, extraída de
// `components/orcamento/OrcamentoAbas.tsx` para ser testável sem precisar
// renderizar o componente (o projeto não tem setup de RTL/jsdom — testes de
// UI aqui são de lógica pura, ver `lib/linha-proposta/valorAtual.ts` como
// precedente do mesmo padrão). Fonte única das 4 abas válidas: usada tanto
// pra normalizar o parâmetro de busca `?aba=` (fallback pra "ambientes"
// quando ausente/inválido) quanto pelos `value` de `TabsTrigger`/
// `TabsContent`.
export const ABAS_VALIDAS = ["ambientes", "corte-material", "financeiro", "proposta"] as const;

export type AbaOrcamento = (typeof ABAS_VALIDAS)[number];

export function normalizarAba(valor: string | null): AbaOrcamento {
  return (ABAS_VALIDAS as readonly string[]).includes(valor ?? "") ? (valor as AbaOrcamento) : "ambientes";
}
