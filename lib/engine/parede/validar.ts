// Validação de encaixe Tier 1 + Tier 2 (briefing 6.6). Função pura: recebe a
// parede, as alturas do perfil da organização e um jeito de resolver
// ItemPosicionado.itemId → ModuloOrcamento (dimensões via larguraDoItem/
// alturaDoItem, lib/orcamento.ts — já tratam custom_box e placa, Task 12.1).

import type { EngineWarning } from "../types";
import { alturaDoItem, larguraDoItem, type ModuloOrcamento } from "../../orcamento";
import type { AlturasFaixas, ElementoParede, Faixa, ItemPosicionado, Parede } from "./types";

export type ResolvedorItens = Map<string, ModuloOrcamento>;

// Y é DERIVADO da faixa (D-20, briefing 6.5) — nunca digitado. Tabela de Y
// (borda inferior do módulo) por faixa, Modelo de Domínio Seção 3.2.1/A-08:
//   inferior → alturaRodape (o módulo começa acima do rodapé, não no chão)
//   torre    → alturaRodape (mesma borda inferior de "inferior" — ocupa dali
//              até o pé-direito; ver Tier 1 "altura ≤ altura da parede")
//   bancada  → alturaBancada (início configurado da faixa)
//   aereo    → alturaInstalacaoAereo (início configurado da faixa)
// `alturas` aqui já deve ser o resultado de `alturasEfetivas` (perfil +
// override da parede) — este função não sabe de override, só aplica a
// tabela sobre o que recebe.
export function derivarY(faixa: Faixa, alturas: AlturasFaixas): number {
  switch (faixa) {
    case "inferior":
      return alturas.alturaRodape;
    case "bancada":
      return alturas.alturaBancada;
    case "aereo":
      return alturas.alturaInstalacaoAereo;
    case "torre":
      return alturas.alturaRodape;
  }
}

// Regra de resolução — a única fonte de Y (Modelo de Domínio Seção 3.2.1,
// Q-1): override é campo a campo, chave ausente/`null` = herdado do perfil
// da organização. "Herdado" vs. "customizado" é sempre derivado daqui, nunca
// um flag persistido.
export function alturasEfetivas(parede: Parede, alturasPadrao: AlturasFaixas): AlturasFaixas {
  return { ...alturasPadrao, ...parede.alturasOverride };
}

function resolveModulo(
  itens: ResolvedorItens,
  itemId: string
): ModuloOrcamento | undefined {
  return itens.get(itemId);
}

// Exportado (Task 12.3, lib/engine/conjunto/detectar.ts reaproveita esta
// checagem de overlap 1D em vez de duplicar a lógica geométrica).
export function intervalosSobrepoem(aInicio: number, aFim: number, bInicio: number, bFim: number): boolean {
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
// bottom→top é inferior/torre (alturaRodape) < bancada (alturaBancada) <
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
  alturasPadrao: AlturasFaixas,
  itens: ResolvedorItens
): EngineWarning[] {
  const warnings: EngineWarning[] = [];
  const alturas = alturasEfetivas(parede, alturasPadrao);

  for (const item of parede.itens) {
    const modulo = resolveModulo(itens, item.itemId);
    if (!modulo) continue;

    const y = derivarY(item.faixa, alturas);
    const altura = alturaDoItem(modulo);
    const chaveTeto = TETO_DA_FAIXA[item.faixa];
    // peDireito é o LIMITE SUPERIOR DE INSTALAÇÃO do aéreo, não a altura
    // física da parede (Modelo de Domínio 3.2.1) — limite efetivo é o menor
    // dos dois.
    const teto = chaveTeto === "peDireito" ? Math.min(alturas.peDireito, parede.altura) : alturas[chaveTeto];

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
// Exportado pelo mesmo motivo de `intervalosSobrepoem` acima (Task 12.3).
export function retangulosSobrepoem(
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
  alturasPadrao: AlturasFaixas,
  itens: ResolvedorItens
): EngineWarning[] {
  const warnings: EngineWarning[] = [];
  const alturas = alturasEfetivas(parede, alturasPadrao);

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

// `alturasPadrao` é o perfil da organização (organizacao.alturas_padrao) —
// o override da própria `parede` (`parede.alturasOverride`) é aplicado aqui
// dentro via `alturasEfetivas`, nunca precisa ser pré-mesclado pelo chamador.
export function validarParedeTier2(
  parede: Parede,
  alturasPadrao: AlturasFaixas,
  itens: ResolvedorItens
): EngineWarning[] {
  return [
    ...validarFaixasNaoColidem(parede, alturasPadrao, itens),
    ...validarItensNaoSobrepoemElementos(parede, alturasPadrao, itens),
  ];
}
