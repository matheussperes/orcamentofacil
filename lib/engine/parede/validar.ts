// Validação de encaixe Tier 1 + Tier 2 (briefing 6.6). Função pura: recebe a
// parede, as alturas do perfil da organização e um jeito de resolver
// ItemPosicionado.itemId → ModuloOrcamento (dimensões via larguraDoItem/
// alturaDoItem, lib/orcamento.ts — já tratam custom_box e placa, Task 12.1).

import type { EngineWarning } from "../types";
import { alturaDoItem, larguraDoItem, type ModuloOrcamento } from "../../orcamento";
import type { AlturasFaixas, ElementoParede, Faixa, ItemPosicionado, Parede } from "./types";

export type ResolvedorItens = Map<string, ModuloOrcamento>;

// Y é DERIVADO da faixa (D-20, briefing 6.5) — nunca digitado. Fórmula
// adotada (decisão de design, doc não fecha a fórmula exata):
//   inferior → 0 (chão)
//   bancada  → alturaBancada (início configurado da faixa)
//   aereo    → alturaInstalacaoAereo (início configurado da faixa)
//   torre    → 0 (chão) — ocupa do chão até o pé-direito, é o próprio item
//              quem carrega essa altura total (ver Tier 1 "altura ≤ altura
//              da parede"); não há um "início" distinto de "inferior".
// `alturaRodape` não participa desta fórmula: o rodapé é o elemento
// contínuo derivado do bloco (Modelo de Domínio, Seção 3.4), uma peça
// aplicada DEPOIS do posicionamento, não um deslocamento do Y dos itens da
// faixa "inferior". Mantido em `AlturasFaixas` porque é um dos 4 valores do
// perfil da organização exigidos pela spec (Modelo de Domínio 3.1, briefing
// 6.5) — reservado para a derivação de `ElementoContinuo` "rodape", fora do
// escopo desta task.
export function derivarY(faixa: Faixa, alturas: AlturasFaixas): number {
  switch (faixa) {
    case "inferior":
      return 0;
    case "bancada":
      return alturas.alturaBancada;
    case "aereo":
      return alturas.alturaInstalacaoAereo;
    case "torre":
      return 0;
  }
}

function resolveModulo(
  itens: ResolvedorItens,
  itemId: string
): ModuloOrcamento | undefined {
  return itens.get(itemId);
}

function intervalosSobrepoem(aInicio: number, aFim: number, bInicio: number, bFim: number): boolean {
  return aInicio < bFim && bInicio < aFim;
}

export function validarParedeTier1(parede: Parede, itens: ResolvedorItens): EngineWarning[] {
  const warnings: EngineWarning[] = [];

  for (const item of parede.itens) {
    const modulo = resolveModulo(itens, item.itemId);
    if (!modulo) {
      warnings.push({
        moduloId: item.itemId,
        severidade: "erro",
        codigo: "ITEM_NAO_ENCONTRADO",
        mensagem: `Item "${item.itemId}" posicionado na parede "${parede.id}" não corresponde a nenhum módulo do orçamento.`,
      });
      continue;
    }

    const largura = larguraDoItem(modulo);
    const altura = alturaDoItem(modulo);

    if (item.x + largura > parede.largura) {
      warnings.push({
        moduloId: item.itemId,
        severidade: "erro",
        codigo: "PAREDE_LARGURA_EXCEDIDA",
        mensagem: `Item "${item.itemId}" (x=${item.x}, largura=${largura}) ultrapassa a largura da parede "${parede.id}" (${parede.largura}mm).`,
      });
    }

    if (altura > parede.altura) {
      warnings.push({
        moduloId: item.itemId,
        severidade: "erro",
        codigo: "PAREDE_ALTURA_EXCEDIDA",
        mensagem: `Item "${item.itemId}" (altura=${altura}) ultrapassa a altura da parede "${parede.id}" (${parede.altura}mm).`,
      });
    }
  }

  // Itens na MESMA faixa não podem se sobrepor horizontalmente. Faixas
  // diferentes não são comparadas aqui — Tier 1 não conhece Y (isso é Tier 2).
  for (const faixa of ["inferior", "bancada", "aereo", "torre"] as Faixa[]) {
    const itensDaFaixa = parede.itens.filter((i) => i.faixa === faixa);

    for (let i = 0; i < itensDaFaixa.length; i++) {
      const a = itensDaFaixa[i];
      const moduloA = resolveModulo(itens, a.itemId);
      if (!moduloA) continue;
      const larguraA = larguraDoItem(moduloA);

      for (let j = i + 1; j < itensDaFaixa.length; j++) {
        const b = itensDaFaixa[j];
        const moduloB = resolveModulo(itens, b.itemId);
        if (!moduloB) continue;
        const larguraB = larguraDoItem(moduloB);

        if (intervalosSobrepoem(a.x, a.x + larguraA, b.x, b.x + larguraB)) {
          warnings.push({
            moduloId: a.itemId,
            severidade: "erro",
            codigo: "ITENS_SOBREPOSTOS",
            mensagem: `Itens "${a.itemId}" e "${b.itemId}" se sobrepõem na faixa "${faixa}" da parede "${parede.id}".`,
          });
        }
      }
    }
  }

  return warnings;
}

// Tier 2a — "faixas não colidem entre si": checa, POR ITEM, se o topo do
// item (Y derivado + altura) invade o início configurado da faixa
// imediatamente acima (ex. do briefing: altura da bancada + altura de um
// item "bancada" não pode ultrapassar a altura de instalação do aéreo).
// Decisão de design (spec não fecha a checagem exata): ordem vertical
// bottom→top é inferior/torre (0) < bancada (alturaBancada) <
// aereo (alturaInstalacaoAereo) < teto (peDireito). "torre" já ocupa do chão
// ao pé-direito por natureza (Tier 1 barra item mais alto que a parede), mas
// também é checada contra o pé-direito aqui por consistência.
const TETO_DA_FAIXA: Record<Faixa, keyof AlturasFaixas> = {
  inferior: "alturaBancada",
  bancada: "alturaInstalacaoAereo",
  aereo: "peDireito",
  torre: "peDireito",
};

function validarFaixasNaoColidem(
  parede: Parede,
  alturas: AlturasFaixas,
  itens: ResolvedorItens
): EngineWarning[] {
  const warnings: EngineWarning[] = [];

  for (const item of parede.itens) {
    const modulo = resolveModulo(itens, item.itemId);
    if (!modulo) continue;

    const y = derivarY(item.faixa, alturas);
    const altura = alturaDoItem(modulo);
    const teto = alturas[TETO_DA_FAIXA[item.faixa]];

    if (y + altura > teto) {
      warnings.push({
        moduloId: item.itemId,
        severidade: "erro",
        codigo: "FAIXA_COLIDE",
        mensagem: `Item "${item.itemId}" na faixa "${item.faixa}" (Y=${y}, altura=${altura}) invade o espaço da faixa seguinte (limite configurado: ${teto}mm) na parede "${parede.id}".`,
      });
    }
  }

  return warnings;
}

// Tier 2b — item posicionado (retângulo x, Y-derivado, largura, altura) não
// pode sobrepor nenhum ElementoParede (retângulo x, y, largura, altura).
function retangulosSobrepoem(
  ax: number,
  ay: number,
  al: number,
  aa: number,
  bx: number,
  by: number,
  bl: number,
  ba: number
): boolean {
  return intervalosSobrepoem(ax, ax + al, bx, bx + bl) && intervalosSobrepoem(ay, ay + aa, by, by + ba);
}

function validarItensNaoSobrepoemElementos(
  parede: Parede,
  alturas: AlturasFaixas,
  itens: ResolvedorItens
): EngineWarning[] {
  const warnings: EngineWarning[] = [];

  for (const item of parede.itens) {
    const modulo = resolveModulo(itens, item.itemId);
    if (!modulo) continue;

    const y = derivarY(item.faixa, alturas);
    const largura = larguraDoItem(modulo);
    const altura = alturaDoItem(modulo);

    for (const elemento of parede.elementos) {
      if (
        retangulosSobrepoem(
          item.x,
          y,
          largura,
          altura,
          elemento.x,
          elemento.y,
          elemento.largura,
          elemento.altura
        )
      ) {
        warnings.push({
          moduloId: item.itemId,
          severidade: "erro",
          codigo: "ITEM_SOBRE_ELEMENTO_PAREDE",
          mensagem: `Item "${item.itemId}" (x=${item.x}, y=${y}) sobrepõe o elemento "${elemento.tipo}" da parede "${parede.id}".`,
        });
      }
    }
  }

  return warnings;
}

export function validarParedeTier2(
  parede: Parede,
  alturas: AlturasFaixas,
  itens: ResolvedorItens
): EngineWarning[] {
  return [
    ...validarFaixasNaoColidem(parede, alturas, itens),
    ...validarItensNaoSobrepoemElementos(parede, alturas, itens),
  ];
}
