// Task 13.7a (contrato .maestro/tmp/13.7a-contract.md) — extraído de
// `components/orcamento/FinanceiroLab.tsx` (Task 13.5) junto com os
// seletores de modo (`SeletorModoPrecificacao.tsx`/`SeletorModoMontagem.tsx`
// neste mesmo diretório). `ModoPrecificacao.percentual`/`ModoMontagem.
// percentual` são sempre FRAÇÃO (0.5 = 50%, `lib/engine/precificacao/
// types.ts`) — estas duas funções puras convertem fração↔percentual pra
// exibição em `<Input type="number">`. Módulo isolado (sem JSX) porque é
// consumido tanto pelos seletores quanto por `FinanceiroLab` (exibição da
// margem de lucro, que não tem relação com modo de precificação/montagem).
export function percentParaFracao(percent: number): number {
  return percent / 100;
}

export function fracaoParaPercent(fracao: number): number {
  return Math.round(fracao * 10000) / 100;
}
