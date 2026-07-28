// Primitiva Placa (Modelo de Domínio, Seção 2) — peça plana única, SEM
// carcaça nem vãos. Uso funcional: prateleira avulsa, fechamento de vão,
// painel de parede, ripado. Contraparte de `BoxModule` no union
// `ModuloOrcamento` (ver lib/orcamento.ts).

import type { BoxMaterial } from "../box/types";
import type { SentidoVeio } from "../types";

export type LadoPlaca = "superior" | "inferior" | "esquerda" | "direita";

export type NivelEngrossamento = 1 | 2 | 3;

// Engrossamento (Seção 2.1): DUAS técnicas com BOMs distintos.
// - "engrossada": peça-base OCA no meio + sarrafos colados nas bordas
//   SELECIONADAS (`lados`). O marceneiro escolhe quais bordas engrossar.
// - "dobrada": placas inteiras (nivel+1) laminadas — peça MACIÇA, sem sarrafo.
export type Engrossamento =
  | {
      tecnica: "engrossada";
      nivel: NivelEngrossamento;
      lados: LadoPlaca[];
      larguraSarrafo?: number; // mm, default 70 (ver SARRAFO_LARGURA_PADRAO)
    }
  | { tecnica: "dobrada"; nivel: NivelEngrossamento };

// Ripado (Seção 2.2): usuário informa quantidade, o espaçamento é derivado
// (D-06). Ver `explodePlaca` para a fórmula geométrica adotada.
export interface Ripado {
  larguraRipa: number; // mm
  quantidade: number;
}

// AcabamentoBorda/BordaPorLado: lacuna real do doc (não totalmente
// especificado). Mantido no mínimo defensável — presença de fita por lado.
// A LARGURA da fita é metadado de catálogo/precificação (deriva da espessura
// final via a tabela da Seção 2.1) — não alimenta `Peca` nesta task, fica
// para uma task futura de pricing.
export interface AcabamentoBorda {
  presente: boolean;
}

export interface BordaPorLado {
  superior?: AcabamentoBorda;
  inferior?: AcabamentoBorda;
  esquerda?: AcabamentoBorda;
  direita?: AcabamentoBorda;
}

export type OrientacaoPlaca = "horizontal" | "vertical" | "alinhada_parede";
export type UsoFuncionalPlaca = "prateleira" | "fechamento_vao" | "painel_parede";

export interface Placa {
  id: string;
  nome: string;
  parede?: string; // igual a BoxModule.parede — default "A" via paredeDoItem
  largura: number; // mm — dimensão de face
  altura: number; // mm — dimensão de face
  // Reaproveita BoxMaterial (cor + espessura) em vez do `MaterialRef` do doc
  // (não existe no código). `material.espessura` é a espessura BASE da chapa
  // — a espessura final deriva do `engrossamento`, quando presente (Seção 2.1).
  material: BoxMaterial;
  orientacao: OrientacaoPlaca;
  // Veio de chapa (Seção 8, Task 12.5). Sentido do veio, escolhido no editor
  // (Task 13.1); quando ausente, `explodePlaca` usa "comprimento" como
  // default. Só relevante quando `material.temVeio` é `true`.
  sentidoVeio?: SentidoVeio;
  bordaPorLado?: BordaPorLado;
  engrossamento?: Engrossamento; // engrossada OU dobrada — mutuamente exclusivas
  ripado?: Ripado; // gerador de peças — ver explodePlaca para precedência
  usoFuncional?: UsoFuncionalPlaca;
}
