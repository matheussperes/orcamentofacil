import type { PrecosReferencia } from "../prices";
import type { EngineOutput, EngineWarning, ResultadoModulo } from "../types";
import {
  baseDoItem,
  calcularCustoMaterial,
  indexarMateriais,
  type BaseItem,
} from "./custo-material";
import { calcularMontagemTotal, calcularPrecoMoveis } from "./modos";
import type {
  ConfiguracaoPrecificacao,
  CustoMaterial,
  GrupoItens,
  RateioSnapshot,
  ResumoFinanceiro,
  ValorGrupo,
} from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

// Distribui `total` (R$) entre pesos, arredondando cada linha a centavos; a
// ÚLTIMA linha absorve o resíduo, de modo que Σ == round2(total) exato
// (Seção 5.2, invariante de arredondamento). Se Σpesos == 0, divide igualmente.
//
// Exportada (Task 13.6a, contrato .maestro/tmp/13.6a-contract.md) — o
// rebalanceamento de override manual de Linha de Proposta
// (`./rebalancear.ts`) reaproveita o MESMO invariante de arredondamento
// (última posição absorve o resíduo) em vez de duplicar a lógica.
export function distribuir(total: number, pesos: number[]): number[] {
  const n = pesos.length;
  if (n === 0) return [];
  const totalR = round2(total);
  const soma = pesos.reduce((a, b) => a + b, 0);
  const out = new Array<number>(n);
  let acc = 0;
  for (let i = 0; i < n - 1; i++) {
    const share = soma > 0 ? totalR * (pesos[i] / soma) : totalR / n;
    const r = round2(share);
    out[i] = r;
    acc += r;
  }
  out[n - 1] = round2(totalR - acc);
  return out;
}

/**
 * Rateio modular por custo alocado (Modelo de Domínio, Seção 5.2), produzindo o
 * snapshot congelável (Seção 5.4). Função PURA e determinística.
 *
 * Composição do preço (decisão de negócio #1):
 *   precoFinal = precoMoveis + montagemTotal + freteTotal
 * Cada componente é rateado por sua PRÓPRIA base (rateio modular, não bloco
 * único):
 *   - móveis e frete  → custo alocado (Seção 5.2 / D-23)
 *   - montagem        → base que ACOMPANHA o modo de cálculo (D-24):
 *       percentual_material / manual → custo alocado
 *       por_chapa                    → chapas alocadas (fracionário)
 *
 * @param grupos partição de itens; cada itemId casa com ResultadoModulo.moduloId.
 */
export function ratearPrecificacao(
  engine: EngineOutput,
  grupos: GrupoItens[],
  config: ConfiguracaoPrecificacao,
  precos: PrecosReferencia
): RateioSnapshot {
  const warnings: EngineWarning[] = [];

  const materiais = indexarMateriais(engine, precos);
  const custoMaterial: CustoMaterial = calcularCustoMaterial(
    engine,
    precos,
    materiais
  );

  const ctx = {
    custoMaterial: custoMaterial.custoMaterial,
    totalChapasInteiro: custoMaterial.totalChapasInteiro,
  };
  const precoMoveis = calcularPrecoMoveis(config.precificacao, ctx);
  const montagemTotal = calcularMontagemTotal(config.montagem, ctx);
  const freteTotal = config.freteTotal;

  // Base de rateio da montagem acompanha o modo (regra de coerência, D-24).
  const montagemPorChapa = config.montagem.modo === "por_chapa";

  // Índice de itens por moduloId + detecção de itens não agrupados.
  const itensPorId = new Map<string, ResultadoModulo>();
  for (const m of engine.porModulo) itensPorId.set(m.moduloId, m);
  const agrupados = new Set<string>();

  // Agrega as bases por grupo (custo alocado e chapas alocadas são aditivos
  // sobre os itens do grupo).
  const grupoBases = grupos.map((g) => {
    let custoAlocado = 0;
    let chapasAlocadas = 0;
    for (const itemId of g.itemIds) {
      const item = itensPorId.get(itemId);
      if (!item) {
        warnings.push({
          severidade: "aviso",
          codigo: "item_inexistente",
          mensagem: `Grupo "${g.id}" referencia item "${itemId}" ausente do EngineOutput.`,
        });
        continue;
      }
      if (agrupados.has(itemId)) {
        warnings.push({
          moduloId: itemId,
          severidade: "aviso",
          codigo: "item_duplicado",
          mensagem: `Item "${itemId}" aparece em mais de um grupo; contado só na primeira ocorrência.`,
        });
        continue;
      }
      agrupados.add(itemId);
      const base: BaseItem = baseDoItem(item, materiais, precos);
      custoAlocado += base.custoAlocado;
      chapasAlocadas += base.chapasAlocadas;
    }
    return { id: g.id, custoAlocado, chapasAlocadas };
  });

  // Itens do orçamento que não caíram em nenhum grupo: avisa (não entram no
  // total, preservando Σ == precoFinal por construção).
  for (const m of engine.porModulo) {
    if (!agrupados.has(m.moduloId)) {
      warnings.push({
        moduloId: m.moduloId,
        severidade: "aviso",
        codigo: "item_sem_grupo",
        mensagem: `Item "${m.moduloId}" não pertence a nenhum grupo; excluído do rateio.`,
      });
    }
  }

  // Componentes rateados com resíduo na última linha (Seção 5.2). Cada total é
  // pré-arredondado a centavos para que precoFinal = soma exata dos três.
  const precoMoveisR = round2(precoMoveis);
  const montagemR = round2(montagemTotal);
  const freteR = round2(freteTotal);
  const precoFinal = round2(precoMoveisR + montagemR + freteR);

  const pesosCusto = grupoBases.map((g) => g.custoAlocado);
  const pesosMontagem = grupoBases.map((g) =>
    montagemPorChapa ? g.chapasAlocadas : g.custoAlocado
  );

  const moveis = distribuir(precoMoveisR, pesosCusto);
  const frete = distribuir(freteR, pesosCusto);
  const montagem = distribuir(montagemR, pesosMontagem);

  const gruposOut: ValorGrupo[] = grupoBases.map((g, i) => ({
    id: g.id,
    valorMoveis: moveis[i],
    valorFrete: frete[i],
    valorMontagem: montagem[i],
    valorRateado: round2(moveis[i] + frete[i] + montagem[i]),
    custoAlocado: round4(g.custoAlocado),
    chapasAlocadas: round4(g.chapasAlocadas),
  }));

  const resumo = calcularResumoFinanceiro(
    precoFinal,
    custoMaterial.custoMaterial,
    montagemR,
    freteR
  );

  return {
    resumo,
    precoMoveis: precoMoveisR,
    montagemTotal: montagemR,
    freteTotal: freteR,
    grupos: gruposOut,
    custoMaterial,
    warnings,
  };
}

/**
 * Resumo financeiro de 6 campos (Seção 5.5).
 *   lucroFinal  = precoFinal − custoMaterial − montagem − frete
 *   margemLucro = lucroFinal ÷ precoFinal  (guardado contra divisão por zero)
 */
export function calcularResumoFinanceiro(
  precoFinal: number,
  custoMaterial: number,
  montagem: number,
  frete: number
): ResumoFinanceiro {
  const precoFinalR = round2(precoFinal);
  const custoMaterialR = round2(custoMaterial);
  const montagemR = round2(montagem);
  const freteR = round2(frete);
  const lucroFinal = round2(precoFinalR - custoMaterialR - montagemR - freteR);
  const margemLucro = precoFinalR > 0 ? round4(lucroFinal / precoFinalR) : 0;
  return {
    precoFinal: precoFinalR,
    custoMaterial: custoMaterialR,
    montagem: montagemR,
    frete: freteR,
    lucroFinal,
    margemLucro,
  };
}
