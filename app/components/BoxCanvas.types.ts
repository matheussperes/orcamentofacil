// V3 — Props públicas de `BoxCanvas`. Extraído de
// `app/components/BoxCanvas.tsx` (Task R.3b — decomposição, sem mudança de
// comportamento/assinatura).

import type { BoxModule } from "@/lib/engine/box/types";
import type { AlturasFaixas } from "@/lib/engine/parede";
import type { Conjunto } from "@/lib/engine/conjunto/types";
import type { TagComercial } from "@/lib/linha-proposta/tipos";
import type { ItemDoConjunto } from "@/lib/engine/box/canvas-geometria";
import type { DivisaoSelecionada, ModoSelecao } from "@/lib/engine/box/canvas-desenho-item-unico";

export type { DivisaoSelecionada, ModoSelecao, ItemDoConjunto };

// Modo item único (`box`) — props de interatividade/seleção completas, como
// já existia. Modo conjunto (`itens` + `alturas`) — Task 13.0, aditivo: sem
// nenhuma prop de interatividade (não há seleção por item nesta task, 13.2).
// União com os campos do outro modo explicitamente `undefined` (em vez de
// discriminada por tag própria) pra poder ler qualquer prop direto do objeto
// sem narrowing manual em cada uso abaixo.
export interface BoxCanvasPropsItemUnico {
  box: BoxModule;
  itens?: undefined;
  alturas?: undefined;
  itensComAviso?: undefined;
  conjuntos?: undefined;
  onToggleJuncao?: undefined;
  tagsComerciais?: undefined;
  /** Modo bonito para cards do orçamento — sem bordas/rótulos técnicos, não interativo. */
  comercial?: boolean;
  modoSelecao?: ModoSelecao;
  vaosSelecionados?: string[];
  onToggleVao?: (id: string) => void;
  divisaoSelecionada?: DivisaoSelecionada | null;
  onSelecionarDivisoria?: (sel: DivisaoSelecionada) => void;
  /** Modo "portas": seleciona um GRUPO de porta existente (pra editar/excluir). */
  portaSelecionada?: string | null;
  onSelecionarPorta?: (id: string) => void;
  /** Modo "gavetas": seleciona o VÃO cujo conteúdo de gaveta vai editar/excluir. */
  vaoGavetaSelecionado?: string | null;
  onSelecionarVaoGaveta?: (id: string) => void;
  /** Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — ver comentário
   * completo na prop homônima de `BoxCanvasPropsConjunto`, abaixo. */
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

export interface BoxCanvasPropsConjunto {
  box?: undefined;
  /** Lista de itens posicionados (conjunto) — cada um com sua faixa/x; Y é
   * sempre derivado via `derivarY`, nunca digitado (D-20). */
  itens: ItemDoConjunto[];
  /** As 4 alturas do perfil da organização, necessárias pra derivar Y a
   * partir da faixa de cada item (`lib/engine/parede::AlturasFaixas`). */
  alturas: AlturasFaixas;
  /** Task 13.2a — item.itemId -> pior severidade de warning que o atinge
   * (`EngineWarning.moduloId` é o `ItemPosicionado.itemId`). Desenha contorno
   * + fundo tintado por cima do item (ver `desenharDestaqueItem`). Opcional:
   * sem esta prop, o modo conjunto se comporta exatamente como na Task 13.0. */
  itensComAviso?: Map<string, "erro" | "aviso">;
  /** Task 13.2b — Conjuntos JÁ RESOLVIDOS (`aplicarOverrides` sobre
   * `detectarConjuntos`, ver lib/engine/conjunto/detectar.ts). Desenha o
   * contorno/colchete (Design-System 9.3) acima de cada Conjunto e decide o
   * ícone (unido/quebrado) de cada handle entre pares adjacentes. Opcional:
   * sem esta prop, o modo conjunto se comporta como nas Tasks 13.0/13.2a (sem
   * contorno de conjunto nem handles). */
  conjuntos?: Conjunto[];
  /** Task 13.2b — chamado ao clicar num handle de junção (círculo entre dois
   * itens adjacentes) pra alternar união/quebra do par. Handles só recebem
   * hit-testing de clique (`clique()`, abaixo) quando ESTA prop E `conjuntos`
   * estão presentes juntas — com só `conjuntos`, os handles são puramente
   * visuais (preserva o early-return da Task 13.0 quando as props novas não
   * são passadas). */
  onToggleJuncao?: (itemIdA: string, itemIdB: string) => void;
  /** Task 2.28-2.30 (RF-37/Q-3) — itemId -> Linha de Proposta (agrupamento
   * comercial) a que pertence (`AmbientesLab.tsx::derivarTagsComerciais`).
   * Desenha um badge/chip SOMENTE LEITURA por cima do item, visualmente
   * distinto do handle/bracket de Conjunto (`CONJUNTO_COR` = `informacao`
   * `#2563EB`, linha+círculo) — usa `TAG_COR` (`accent`, Design-System Seção
   * 2.3) num chip preenchido. Opcional: sem esta prop, o modo conjunto se
   * comporta exatamente como antes desta task (nenhum consumidor existente —
   * `LinhaPropostaCard.tsx`, `PropostaLab.tsx`, Editor de Item — a passa). */
  tagsComerciais?: Map<string, TagComercial>;
  comercial?: undefined;
  modoSelecao?: undefined;
  vaosSelecionados?: undefined;
  onToggleVao?: undefined;
  divisaoSelecionada?: undefined;
  onSelecionarDivisoria?: undefined;
  portaSelecionada?: undefined;
  onSelecionarPorta?: undefined;
  vaoGavetaSelecionado?: undefined;
  onSelecionarVaoGaveta?: undefined;
  /** Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — mudança pequena e
   * ADITIVA: `BoxCanvas` não expunha o `<canvas>` interno pro caller (só
   * usava a `ref` internamente). A aba "Proposta" precisa capturar o
   * `<canvas>` do modo conjunto para gerar a imagem de render de cada Linha
   * de Proposta (`canvas.toDataURL('image/png')` — ver
   * `components/orcamento/LinhaPropostaCard.tsx`). Chamado a cada commit
   * (não só na montagem) com o elemento atual — sem esta prop, nenhum
   * comportamento muda (nenhum consumidor existente a passa: `/modulo`,
   * `/ambientes`, Corte&Material). Existe também no modo item único
   * (`BoxCanvasPropsItemUnico`, acima) pela mesma razão de simetria de tipo
   * já usada nas outras props (`comercial`, etc.), embora esta task só use o
   * modo conjunto. */
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

export type BoxCanvasProps = BoxCanvasPropsItemUnico | BoxCanvasPropsConjunto;
