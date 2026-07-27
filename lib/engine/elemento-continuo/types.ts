// Elemento Contínuo unificado (Modelo de Domínio, Seção 3.4/3.5; Task 12.4) —
// tampo, rodapé, tamponamento e fechamento são o MESMO mecanismo: elemento
// aplicado a um Conjunto (bloco) ou módulo isolado, com dimensão derivada da
// geometria do alvo. Substitui o "elemento contínuo do V1" e o tamponamento
// ESTRUTURAL que vivia em `BayContent` (ver lib/engine/box/types.ts — branch
// removido nesta task, Seção 3.6).

import type { BoxMaterial } from "../box/types";
import type { Engrossamento } from "../placa/types";

export type TipoElementoContinuo = "tampo" | "rodape" | "tamponamento" | "fechamento";

export type PosicaoElemento = "superior" | "base" | "esquerda" | "direita" | "topo";

// Bloco (Conjunto físico, Seção 3.3) ou módulo isolado — mesmo union já usado
// por `Conjunto`/`ElementoContinuo.alvo` na spec.
export type AlvoElementoContinuo = { conjuntoId: string } | { moduloId: string };

// Posições válidas por tipo (Seção 3.4, tabela). Usado por `validarPosicao`.
export const POSICOES_VALIDAS: Record<TipoElementoContinuo, PosicaoElemento[]> = {
  tampo: ["superior"],
  rodape: ["base"],
  tamponamento: ["esquerda", "direita", "base", "topo"],
  fechamento: ["superior", "esquerda", "direita"],
};

export type TipoTamponamento = "inteiro" | "sarrafo";

export interface ElementoContinuo {
  id: string;
  tipo: TipoElementoContinuo;
  alvo: AlvoElementoContinuo;
  posicao: PosicaoElemento;
  // = `MaterialRef` no Modelo de Domínio. O doc declara `material` e um campo
  // `espessura` irmão separado — igual ao que acontecia com `Placa`/`MaterialRef`
  // na Task 12.1. `BoxMaterial` já carrega `.espessura`; reaproveitamos em vez
  // de duplicar um campo solto (mesma decisão de `lib/engine/placa/types.ts`).
  material: BoxMaterial;
  // Derivado ≠ imutável (Seção 3.4): default sugerido no momento de adicionar,
  // editável depois — vale para tampo/rodapé/fechamento. Ignorado por completo
  // para tamponamento (única exceção — Seção 3.5, nunca digitável). Mapeamento
  // por tipo, ver `explode.ts`:
  //  - tampo: largura/profundidade (peça); altura não se aplica (a "altura" do
  //    tampo é a espessura do material, controlada por `engrossamento`).
  //  - rodapé: largura/profundidade/altura, todos os 3 (profundidade é medida
  //    de recuo/posicionamento, não dimensão de corte — ver Seção A-07).
  //  - fechamento: `largura` = comprimento do sarrafo (largura ou altura
  //    total do bloco, conforme posição); `altura` = largura do sarrafo
  //    (50mm default); `profundidade` não se aplica.
  override?: Partial<{ largura: number; profundidade: number; altura: number }>;
  // Só tampo (Seção 2.1/3.4) — reaproveita o tipo da Task 12.1, mesma regra.
  engrossamento?: Engrossamento;
  // Só usado quando `tipo === "tamponamento"`. A Seção 3.5 descreve um tipo
  // `Tamponamento` à parte com seu PRÓPRIO campo `tipo: "inteiro" | "sarrafo"`
  // — mas `ElementoContinuo.tipo` já é o discriminante dos 4 elementos, então
  // não dá pra reaproveitar o mesmo nome pra um segundo discriminante. Este
  // campo carrega esse dado sem colidir (decisão de design, ver relatório).
  tamponamentoTipo?: TipoTamponamento;
}

// Tipo de referência da Seção 3.5, mantido pra conformidade com a spec (é
// citado explicitamente como tipo a criar). Não é o formato usado internamente
// por `explode.ts` (que opera sobre `ElementoContinuo` + `tamponamentoTipo`
// acima) — serve como shape narrow/standalone pra quem só quer descrever um
// tamponamento sem montar um `ElementoContinuo` inteiro.
export interface Tamponamento {
  tipo: TipoTamponamento;
  posicao: Extract<PosicaoElemento, "esquerda" | "direita" | "base" | "topo">;
  // Já carrega espessura (`BoxMaterial.espessura`) — mesma decisão de reaproveitamento
  // documentada acima em `ElementoContinuo.material`.
  material: BoxMaterial;
}

// Dimensões de UM módulo já resolvidas pelo chamador — via `larguraDoItem`/
// `alturaDoItem`/`profundidadeDoItem` de `lib/orcamento.ts` (que já tratam
// `custom_box` e `placa`). Este módulo (Motor Engineer, função pura) NUNCA
// resolve `conjuntoId`/`moduloId` em dimensões sozinho — isso é I/O de
// domínio (olhar o Conjunto, os itens do orçamento) que cabe à camada de
// cima; aqui só entram os números já prontos.
export interface ModuloResolvido {
  largura: number;
  profundidade: number;
  altura: number;
}

// Alvo já resolvido pelo chamador, na forma que cada tipo de elemento precisa:
//  - tampo/rodapé/fechamento: TODOS os itens do bloco (Conjunto), na ordem que
//    fizer sentido pro chamador (soma/máximo não dependem de ordem) — um
//    módulo isolado é só um array de 1 item.
//  - tamponamento: o módulo da EXTREMIDADE exposta já identificado pelo
//    chamador (Seção 3.5: "encosta na face lateral de um único módulo — o da
//    ponta exposta"). Decisão de design: qual item de um Conjunto é "a
//    extremidade" pra cada posição (esquerda/direita = ponta x mínimo/máximo;
//    base/topo não têm noção de extremidade horizontal num bloco — Conjunto é
//    puramente horizontal, Seção 3.3) é responsabilidade de quem monta este
//    objeto, não deste módulo — ver relatório final.
export type AlvoResolvido =
  | { itens: ModuloResolvido[] }
  | { moduloExtremidade: ModuloResolvido };
