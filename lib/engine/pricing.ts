import { PRECOS_REFERENCIA, precoChapa, type PrecosReferencia } from "./prices";
import type { EngineOutput } from "./types";

// Pipeline financeiro (doc 05): consolidado da engine → custo direto →
// markup divisor → preço de venda. Puro e determinístico.

export interface ParametrosComerciais {
  margem: number; // fração, ex.: 0.35
  impostos: number; // fração
  comissao: number; // fração
  desconto: number; // fração aplicada sobre o preço final
  custosFixosIndiretos: number; // R$ (deslocamento, etc.)
  margemMinima: number; // fração — trava de validação (RF-006)
}

export interface DetalheCusto {
  descricao: string;
  valor: number;
}

export interface ResultadoFinanceiro {
  custoDireto: number;
  detalhes: DetalheCusto[];
  precoFinal: number;
  precoComDesconto: number;
  lucroBruto: number;
  margemEfetiva: number; // após desconto
  abaixoDaMargemMinima: boolean;
  avisos: string[];
}

const SOMA_MAX_DIVISOR = 0.85; // trava de segurança do markup divisor

/** Passos 1–4 do doc 05. */
export function calcularPreco(
  engine: EngineOutput,
  comercial: ParametrosComerciais,
  precos: PrecosReferencia = PRECOS_REFERENCIA
): ResultadoFinanceiro {
  const detalhes: DetalheCusto[] = [];
  const avisos: string[] = [];

  // --- Passo 3a: MDF (chapas já calculadas na engine) ---
  let custoMdf = 0;
  let areaMdfTotal = 0;
  for (const g of engine.consolidado.mdf) {
    const unit = precoChapa(precos, g.cor, g.espessura_mm);
    if (unit === 0) {
      avisos.push(
        `Sem preço cadastrado para chapa ${g.cor} ${g.espessura_mm}mm.`
      );
    }
    custoMdf += g.chapas * unit;
    areaMdfTotal += g.area_m2;
  }
  detalhes.push({ descricao: "MDF (chapas)", valor: round2(custoMdf) });

  // --- Passo 3b: fita de borda ---
  const custoFita = engine.consolidado.fitaTotalM * precos.fitaMetro;
  detalhes.push({ descricao: "Fita de borda", valor: round2(custoFita) });

  // --- Passo 3c: ferragens ---
  let custoFerragens = 0;
  for (const f of engine.consolidado.ferragens) {
    const unit = precos.ferragens[f.item] ?? 0;
    if (unit === 0) avisos.push(`Sem preço de referência para ferragem: ${f.item}.`);
    custoFerragens += f.quantidade * unit;
  }
  detalhes.push({ descricao: "Ferragens e acessórios", valor: round2(custoFerragens) });

  // --- Passo 3d: montagem e frete ---
  const custoMontagem = areaMdfTotal * precos.montagemPorM2;
  detalhes.push({ descricao: "Montagem", valor: round2(custoMontagem) });
  detalhes.push({ descricao: "Frete", valor: round2(precos.freteFixo) });

  const custoDireto =
    custoMdf + custoFita + custoFerragens + custoMontagem + precos.freteFixo;

  // --- Passo 4: markup divisor ---
  const somaPercentual = comercial.margem + comercial.impostos + comercial.comissao;
  if (somaPercentual >= SOMA_MAX_DIVISOR) {
    avisos.push(
      `Margem + impostos + comissão (${pct(somaPercentual)}) excede o limite de ${pct(
        SOMA_MAX_DIVISOR
      )}. Preço travado no limite.`
    );
  }
  const divisor = 1 - Math.min(somaPercentual, SOMA_MAX_DIVISOR);
  const precoFinal = (custoDireto + comercial.custosFixosIndiretos) / divisor;

  // --- Passo 5: desconto e validação de margem mínima (RF-006) ---
  // Impostos e comissão incidem sobre o preço de venda; o lucro é líquido
  // dessas deduções (doc 05: sem desconto, margem efetiva ≈ margem de entrada).
  const precoComDesconto = precoFinal * (1 - comercial.desconto);
  const deducoes =
    precoComDesconto * (comercial.impostos + comercial.comissao);
  const lucroBruto =
    precoComDesconto - deducoes - (custoDireto + comercial.custosFixosIndiretos);
  const margemEfetiva = precoComDesconto > 0 ? lucroBruto / precoComDesconto : 0;
  const abaixoDaMargemMinima = margemEfetiva < comercial.margemMinima;
  if (abaixoDaMargemMinima) {
    avisos.push(
      `Margem efetiva (${pct(margemEfetiva)}) abaixo da mínima (${pct(
        comercial.margemMinima
      )}). Requer aprovação.`
    );
  }

  return {
    custoDireto: round2(custoDireto),
    detalhes,
    precoFinal: round2(precoFinal),
    precoComDesconto: round2(precoComDesconto),
    lucroBruto: round2(lucroBruto),
    margemEfetiva: round4(margemEfetiva),
    abaixoDaMargemMinima,
    avisos,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}
