// Posicionamento por vão até o vizinho <-> X absoluto (Modelo de Domínio,
// Seção 3.1.1, "[V2.1] Entrada em VÃO, armazenamento em X absoluto", Task
// 2.18 motor). `ItemPosicionado.x` continua absoluto — decisão fechada do
// operador, ver a nota no topo da Seção 3.1.1. Este arquivo é só a camada de
// entrada/exibição em cima do que já existe: converte o vão que o
// marceneiro digita para o `x` que é armazenado, e reconverte `x` para o vão
// exibido dos dois lados. Nenhuma função aqui muda `parede.itens` — todas
// recebem o estado e devolvem um valor calculado (função pura, sem efeito
// colateral), o que já garante sozinho o invariante de não-movimento do
// item 5 do contrato: apagar um item do meio nunca reescreve o `x` dos
// remanescentes, só o vão exibido muda na próxima chamada de
// `converterXParaVao`.

import { larguraDoItem } from "../../orcamento";
import type { ResolvedorItens } from "./validar";
import type { Faixa, ItemPosicionado, Parede } from "./types";

export type ReferenciaVao = "esquerda" | "direita";

/** Um vizinho encontrado: o item cuja borda é a mais próxima do item em
 * questão, ou `itemId: null` quando não há vizinho e a borda usada é a da
 * própria parede (Seção 3.1.1: "Ausência de vizinho = a própria parede"). */
export interface Vizinho {
  itemId: string | null;
  borda: number;
}

export interface Vizinhos {
  esquerdo: Vizinho;
  direito: Vizinho;
}

/** Item ainda sem `itemId` na parede (entrada) usa este shape sem o campo;
 * um item já posicionado (exibição) passa o próprio `itemId` pra se
 * auto-excluir da busca de candidatos (ele não pode ser vizinho de si
 * mesmo). */
export interface ItemParaVizinhos {
  itemId?: string;
  faixa: Faixa;
  x: number;
  largura: number;
}

// "candidatos(F) = itens da faixa F ∪ itens da faixa 'torre' (F != torre);
// candidatos(torre) = itens de inferior ∪ bancada ∪ aereo ∪ torre" — a torre
// ocupa as três faixas (item 2.16), por isso é vizinha de todas e todas são
// vizinhas dela.
function faixasCandidatas(faixa: Faixa): Faixa[] {
  return faixa === "torre" ? ["inferior", "bancada", "aereo", "torre"] : [faixa, "torre"];
}

/** Função #1 do contrato: dado um item (faixa, x, largura) — já posicionado
 * ou apenas provisório, ver nota de decisão abaixo — e os itens já
 * posicionados na parede, encontra o vizinho esquerdo (maior borda direita
 * <= x) e o vizinho direito (menor borda esquerda >= x + largura).
 *
 * Decisão de design (spec não fecha este ponto): para um item AINDA NÃO
 * posicionado (entrada), o `x` provisório que produz os vizinhos dos 4
 * exemplos trabalhados da Seção 3.1.1 é "encostado na borda direita da
 * parede" (`parede.largura - largura`) — a única forma de entrada que os
 * exemplos demonstram é anexar ao final da sequência ocupada, nunca inserir
 * no meio de um vão livre já existente. Com esse provisório, o vizinho
 * esquerdo sai sempre como o item mais à direita já posicionado na faixa (o
 * candidato certo pra ref "esquerda") e o vizinho direito sai sempre como a
 * própria parede (o candidato certo pra ref "direita", que mede até a
 * parede quando não há nada além do último item). Qual `x` provisório usar
 * é decisão de quem chama esta função (Task 2.18-front, fora de escopo) —
 * esta função em si só implementa a busca genérica dado um `x`. */
export function calcularVizinhos(parede: Parede, resolvedor: ResolvedorItens, item: ItemParaVizinhos): Vizinhos {
  const faixasAceitas = faixasCandidatas(item.faixa);
  const fimDoVaoLivre = item.x + item.largura;

  let esquerdo: Vizinho = { itemId: null, borda: 0 };
  let direito: Vizinho = { itemId: null, borda: parede.largura };

  for (const outro of parede.itens) {
    if (outro.itemId === item.itemId) continue; // um item não é vizinho de si mesmo
    if (!faixasAceitas.includes(outro.faixa)) continue;

    const modulo = resolvedor.get(outro.itemId);
    if (!modulo) continue; // sem módulo resolvível, sem largura conhecida — ignora (mesmo tratamento silencioso de validar.ts)

    const bordaEsquerda = outro.x;
    const bordaDireita = outro.x + larguraDoItem(modulo);

    if (bordaDireita <= item.x && bordaDireita > esquerdo.borda) {
      esquerdo = { itemId: outro.itemId, borda: bordaDireita };
    }
    if (bordaEsquerda >= fimDoVaoLivre && bordaEsquerda < direito.borda) {
      direito = { itemId: outro.itemId, borda: bordaEsquerda };
    }
  }

  return { esquerdo, direito };
}

export type ErroConversaoVao = "VAO_NEGATIVO" | "FORA_DA_PAREDE";

export type ResultadoConversaoVao = { ok: true; x: number } | { ok: false; codigo: ErroConversaoVao; mensagem: string };

/** Função #2 do contrato: converte o vão digitado em `x` absoluto (Seção
 * 3.1.1, bloco "Conversão de entrada"). Recebe os vizinhos já calculados
 * (função #1) — não os recalcula.
 *
 * Validações como ERRO, não aviso (tabela da Seção 3.1.1): `vao < 0` e
 * `x < 0` resultante rejeitam a entrada. `x + largura > parede.largura`
 * (PAREDE_LARGURA_EXCEDIDA) NÃO é checado aqui de propósito — é a mesma
 * checagem que `validarParedeTier1` já faz (lib/engine/parede/validar.ts)
 * uma vez que o item entra em `parede.itens`; duplicar o código de erro
 * aqui divergiria da mensagem/código já revisados naquele Tier 1. */
export function converterVaoParaX(
  vao: number,
  ref: ReferenciaVao,
  largura: number,
  vizinhos: Vizinhos
): ResultadoConversaoVao {
  if (vao < 0) {
    return { ok: false, codigo: "VAO_NEGATIVO", mensagem: `Vão não pode ser negativo (recebido: ${vao}mm).` };
  }

  const x = ref === "esquerda" ? vizinhos.esquerdo.borda + vao : vizinhos.direito.borda - vao - largura;

  if (x < 0) {
    return {
      ok: false,
      codigo: "FORA_DA_PAREDE",
      mensagem: `Posição resultante (x=${x}mm) fica fora da parede.`,
    };
  }

  return { ok: true, x };
}

export interface VaoExibido {
  esquerda: number;
  direita: number;
}

/** Função #3 do contrato: dado um item já posicionado (x, largura, faixa) e
 * os demais itens da parede, devolve o vão exibido dos dois lados —
 * recalculado a partir dos vizinhos ATUAIS a cada chamada, nunca lido de um
 * campo armazenado (Seção 3.1.1, bloco "Conversão de exibição"). `undefined`
 * quando `item.itemId` não resolve pra nenhum módulo do orçamento (mesmo
 * tratamento silencioso do resto do motor de parede pra item órfão — Tier 1
 * já cobre esse caso como `ITEM_NAO_ENCONTRADO`). */
export function converterXParaVao(
  parede: Parede,
  resolvedor: ResolvedorItens,
  item: ItemPosicionado
): VaoExibido | undefined {
  const modulo = resolvedor.get(item.itemId);
  if (!modulo) return undefined;

  const largura = larguraDoItem(modulo);
  const vizinhos = calcularVizinhos(parede, resolvedor, {
    itemId: item.itemId,
    faixa: item.faixa,
    x: item.x,
    largura,
  });

  return {
    esquerda: item.x - vizinhos.esquerdo.borda,
    direita: vizinhos.direito.borda - (item.x + largura),
  };
}
