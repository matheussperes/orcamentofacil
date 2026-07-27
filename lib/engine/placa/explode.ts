import type { ItemQtd, Peca } from "../types";
import type { BoxMaterial } from "../box/types";
import type { LadoPlaca, Placa } from "./types";

// Explosão geométrica da primitiva Placa (Modelo de Domínio, Seção 2/2.1/2.2).
// Função pura: dada uma Placa, devolve `{ pecas: Peca[], ferragens, areaMdfM2,
// fitaM }`, mesmo padrão de `lib/engine/box/explode.ts` (helper `push` que
// ignora dimensões ≤ 0 e calcula area_m2/fita_m já × quantidade).

const SARRAFO_LARGURA_PADRAO = 70; // mm

export interface PlacaResult {
  pecas: Peca[];
  ferragens: ItemQtd[];
  areaMdfM2: number;
  fitaM: number;
  // Só presente quando `placa.ripado` está setado — espaçamento derivado
  // (D-06) entre ripas, ao longo da dimensão maior da placa.
  espacamentoRipasMm?: number;
}

interface Ctx {
  pecas: Peca[];
}

function push(
  ctx: Ctx,
  nome: string,
  quantidade: number,
  material: BoxMaterial,
  altura: number,
  largura: number
) {
  if (quantidade <= 0 || altura <= 0 || largura <= 0) return;
  ctx.pecas.push({
    nome,
    quantidade,
    // Não há valor de MaterialTipo dedicado a "placa avulsa" no enum atual
    // (caixa|frente|fundo|prateleira) — "prateleira" é o mais próximo
    // semanticamente (peça plana solta, sem função de carcaça/frente/fundo)
    // e material_tipo não alimenta lógica alguma hoje (só rótulo — ver
    // lib/engine/consolidar.ts, que agrupa por cor×espessura). Se um valor
    // dedicado ("placa") for desejado, é decisão de enum a validar com o
    // Maestro antes de mudar `MaterialTipo` (usado por templates V1 também).
    material_tipo: "prateleira",
    cor: material.cor,
    espessura_mm: material.espessura,
    altura_mm: Math.round(altura),
    largura_mm: Math.round(largura),
    area_m2: round4((altura * largura * quantidade) / 1e6),
    // Fita de borda por espessura final é regra de catálogo (Seção 2.1,
    // "Fita de borda por espessura final") — não implementada nesta task
    // (fora de escopo: pricing/catálogo). fita_m fica 0 para peças de Placa.
    fita_m: 0,
  });
}

/**
 * Valida a combinação nível × espessura-base (Seção 2.1, decisão do operador
 * 2026-07-27): base 18mm só vai até nível 2 (54mm) — nível 3 daria 72mm, que
 * excede a maior fita do catálogo (65mm). Vale para as duas técnicas. Base
 * 15mm aceita os 3 níveis normalmente. Fail-fast: a UI da Fase C vai impedir
 * essa combinação de existir, mas o motor é a rede de segurança final.
 */
function validarNivelEspessuraBase(espessuraBase: number, nivel: 1 | 2 | 3) {
  if (espessuraBase === 18 && nivel === 3) {
    throw new Error(
      `Engrossamento/dobra inválido: base de 18mm não suporta nível 3 (72mm excede a maior fita do catálogo, 65mm). Use nível 1 ou 2, ou base de 15mm.`
    );
  }
}

const LADOS_ORDEM: LadoPlaca[] = ["superior", "inferior", "esquerda", "direita"];

function eixoDoLado(lado: LadoPlaca): "largura" | "altura" {
  return lado === "superior" || lado === "inferior" ? "largura" : "altura";
}

function perpendicularesDoLado(lado: LadoPlaca): LadoPlaca[] {
  return eixoDoLado(lado) === "largura" ? ["esquerda", "direita"] : ["superior", "inferior"];
}

/**
 * Engrossada: peça-base OCA (espessura = base) + sarrafos nas bordas
 * SELECIONADAS. Sarrafos do eixo MAIOR (a dimensão — largura ou altura — que
 * for numericamente maior) correm o comprimento inteiro daquele eixo;
 * sarrafos do eixo MENOR encaixam entre os do eixo maior selecionados:
 * comprimento = dimensão_menor − (larguraSarrafo × nº de lados perpendiculares
 * selecionados). Lado não selecionado não gera peça alguma.
 */
function explodeEngrossada(
  ctx: Ctx,
  placa: Placa,
  nivel: 1 | 2 | 3,
  lados: LadoPlaca[],
  larguraSarrafo: number
) {
  const material = placa.material;

  // Peça-base oca (não vira maciça — só as bordas selecionadas ganham
  // espessura via sarrafo).
  push(ctx, "Placa (base, engrossada)", 1, material, placa.altura, placa.largura);

  const eixoMaior: "largura" | "altura" = placa.largura >= placa.altura ? "largura" : "altura";
  const selecionados = new Set(lados);

  for (const lado of LADOS_ORDEM) {
    if (!selecionados.has(lado)) continue;

    const proprioEixo = eixoDoLado(lado);
    const dimensaoPropria = proprioEixo === "largura" ? placa.largura : placa.altura;

    let comprimento: number;
    if (proprioEixo === eixoMaior) {
      comprimento = dimensaoPropria;
    } else {
      const perpendicularesSelecionados = perpendicularesDoLado(lado).filter((p) =>
        selecionados.has(p)
      ).length;
      comprimento = dimensaoPropria - larguraSarrafo * perpendicularesSelecionados;
    }

    push(ctx, `Sarrafo engrossamento (${lado})`, nivel, material, comprimento, larguraSarrafo);
  }
}

/** Dobrada: nivel+1 placas inteiras (mesmas dimensões de face), laminadas. */
function explodeDobrada(ctx: Ctx, placa: Placa, nivel: 1 | 2 | 3) {
  push(ctx, "Placa (dobrada)", nivel + 1, placa.material, placa.altura, placa.largura);
}

/**
 * Ripado (Seção 2.2): N ripas de `larguraRipa` distribuídas uniformemente ao
 * longo da DIMENSÃO MAIOR da placa (eixo de distribuição); cada ripa corre o
 * comprimento inteiro da dimensão MENOR (perpendicular). Espaçamento
 * derivado: o que sobra da dimensão maior depois de subtrair as N ripas,
 * dividido igualmente entre os N−1 vãos entre elas (0 quando N ≤ 1).
 * Fórmula: espacamento = (dimMaior − N×larguraRipa) / (N−1).
 */
function explodeRipado(ctx: Ctx, placa: Placa): number | undefined {
  const ripado = placa.ripado;
  if (!ripado) return undefined;

  const dimMaior = Math.max(placa.largura, placa.altura);
  const dimMenor = Math.min(placa.largura, placa.altura);
  const { larguraRipa, quantidade } = ripado;

  push(ctx, "Ripa", quantidade, placa.material, dimMenor, larguraRipa);

  if (quantidade <= 1) return 0;
  return round4((dimMaior - quantidade * larguraRipa) / (quantidade - 1));
}

export function explodePlaca(placa: Placa): PlacaResult {
  const ctx: Ctx = { pecas: [] };

  if (placa.engrossamento) {
    validarNivelEspessuraBase(placa.material.espessura, placa.engrossamento.nivel);
  }

  let espacamentoRipasMm: number | undefined;

  if (placa.ripado) {
    // Ripado é um gerador de peças que SUBSTITUI o painel sólido por N
    // ripas — precedência sobre engrossamento quando ambos setados (a spec
    // não cobre a combinação nos 6 exemplos trabalhados; combinar os dois
    // fica para uma task futura, se necessário).
    espacamentoRipasMm = explodeRipado(ctx, placa);
  } else if (placa.engrossamento?.tecnica === "engrossada") {
    const { nivel, lados, larguraSarrafo } = placa.engrossamento;
    explodeEngrossada(ctx, placa, nivel, lados, larguraSarrafo ?? SARRAFO_LARGURA_PADRAO);
  } else if (placa.engrossamento?.tecnica === "dobrada") {
    explodeDobrada(ctx, placa, placa.engrossamento.nivel);
  } else {
    push(ctx, "Placa", 1, placa.material, placa.altura, placa.largura);
  }

  const areaMdfM2 = round4(ctx.pecas.reduce((s, p) => s + p.area_m2, 0));
  const fitaM = round4(ctx.pecas.reduce((s, p) => s + p.fita_m, 0));

  return {
    pecas: ctx.pecas,
    ferragens: [],
    areaMdfM2,
    fitaM,
    espacamentoRipasMm,
  };
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
