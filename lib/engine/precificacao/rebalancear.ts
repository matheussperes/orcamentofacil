import { distribuir } from "./rateio";

// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md, fatia "Motor
// Engineer") — rebalanceamento do override manual de uma Linha de Proposta
// (`docs/Modelo-de-Dominio.md` Seção 6: "edita uma linha, rebalanceia as
// demais preservando a soma"). Função PURA e determinística, mesmo espírito
// de `ratearPrecificacao`/`distribuir` (rateio.ts) — nenhum I/O aqui.
//
// A spec não detalha a fórmula exata de como a diferença é redistribuída
// entre as OUTRAS linhas — decisão registrada aqui (Recomendação do Maestro
// no contrato, adotada sem alteração): a diferença
// `precoFinal − novoValor(linha editada)` é redistribuída entre as demais
// linhas PROPORCIONAL ao peso atual de cada uma (`valorRateado` antes da
// edição, isto é, o valor exibido no momento em que o usuário editou) —
// mesmo padrão de arredondamento já usado em `rateio.ts::distribuir`: a
// ÚLTIMA linha (entre as "outras", na ordem em que aparecem no array de
// entrada) absorve o resíduo de centavos, garantindo
// `Σ valorRateado === round2(precoFinal)` EXATO, nunca aproximado.
//
// Múltiplos overrides em sequência (usuário edita a linha A, depois edita a
// linha B): a spec também não cobre este caso — decisão registrada aqui:
// cada edição rebalanceia sobre o estado ATUAL (os `valorRateado` já
// rebalanceados pela edição anterior), NUNCA sobre o estado original antes
// de qualquer override. Isto é uma consequência direta de a função receber
// `linhasAtuais` como parâmetro em vez de guardar histórico internamente —
// quem chama (`components/orcamento/PropostaLab.tsx`) é responsável por
// sempre passar o estado mais recente (rebalanceado ou não) como
// `linhasAtuais` da próxima chamada. Overrides anteriores NÃO ficam
// "travados": uma edição seguinte pode voltar a mexer no valor de uma linha
// que já tinha sido rebalanceada por uma edição anterior — é o
// comportamento mais previsível para o usuário (o valor em tela é sempre a
// fonte da verdade, nunca um estado oculto de "já foi editado antes").
//
// Caso-limite documentado, não tratado como erro: se `novoValor` da linha
// editada for MAIOR que `precoFinal`, a diferença redistribuída para as
// demais linhas fica negativa (alguma(s) linha(s) podem ficar com
// `valorRateado` negativo). A função permanece pura e não impede isso — é
// um estado matematicamente válido (a soma continua batendo exato), mas
// operacionalmente estranho; cabe à UI (Design-System Seção 7.13, Alert)
// avisar o usuário da consequência, não a esta função decidir por ele.
export interface LinhaRateada {
  id: string;
  valorRateado: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Rebalanceia as linhas de proposta depois de um override manual, preservando
 * a soma total (`precoFinal`).
 *
 * @param linhasAtuais estado atual de cada linha (id + valorRateado exibido
 *   agora — já pode incluir rebalanceamentos de overrides anteriores).
 * @param idLinhaEditada id da linha que o usuário editou manualmente.
 * @param novoValor novo valor digitado pelo usuário para essa linha.
 * @param precoFinal total que a soma de todas as linhas precisa preservar
 *   (`ResumoFinanceiro.precoFinal`, já arredondado a centavos).
 * @returns novo array, MESMA ordem/tamanho de `linhasAtuais`, com os valores
 *   redistribuídos. Se `idLinhaEditada` não existir em `linhasAtuais`, devolve
 *   `linhasAtuais` sem alteração (chamada inválida, não deveria acontecer na
 *   UI — o id sempre vem de uma linha renderizada).
 */
export function rebalancearLinhas(
  linhasAtuais: LinhaRateada[],
  idLinhaEditada: string,
  novoValor: number,
  precoFinal: number
): LinhaRateada[] {
  const existe = linhasAtuais.some((l) => l.id === idLinhaEditada);
  if (!existe) return linhasAtuais;

  const precoFinalR = round2(precoFinal);
  const novoValorR = round2(novoValor);
  const restante = round2(precoFinalR - novoValorR);

  // Índices das "outras" linhas (preservando a ordem original) — a última
  // delas absorve o resíduo de `distribuir`.
  const outras = linhasAtuais.filter((l) => l.id !== idLinhaEditada);
  const pesos = outras.map((l) => l.valorRateado);
  const redistribuidos = distribuir(restante, pesos);
  const valorPorId = new Map<string, number>(outras.map((l, i) => [l.id, redistribuidos[i]]));
  valorPorId.set(idLinhaEditada, novoValorR);

  return linhasAtuais.map((l) => ({ id: l.id, valorRateado: valorPorId.get(l.id) ?? l.valorRateado }));
}
