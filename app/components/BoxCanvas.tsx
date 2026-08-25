"use client";

import { useEffect, useRef, useState } from "react";
import { layoutDivisorias, type DivisoriaRect } from "@/lib/engine/box/tree";
import { geometria, geometriaHandles, W, H } from "@/lib/engine/box/canvas-geometria";
import { retanguloDoGrupo } from "@/lib/engine/box/canvas-desenho-partes";
import { desenharItemUnico } from "@/lib/engine/box/canvas-desenho-item-unico";
import { desenharConjunto, HANDLE_RAIO_PX } from "@/lib/engine/box/canvas-desenho-conjunto";
import type { BoxCanvasProps } from "./BoxCanvas.types";

// V3 — Canvas 2D do módulo-caixa, em dois modos:
//  - Laboratório (padrão): vãos com borda técnica, rótulo do conteúdo,
//    seleção múltipla de vãos ou seleção de uma divisória — usado em
//    /modulo, onde o clique importa.
//  - Comercial (`comercial`): visual limpo, sem bordas/rótulos técnicos,
//    com indicadores de portas/gavetas no mesmo estilo do ModulePreview
//    (linhas divisórias finas + marcas de puxador) — usado nos cards do
//    orçamento, onde a imagem precisa ficar "bonitinha".
//
// Em ambos os modos, os grupos de porta (`box.portas`) são desenhados por
// cima dos vãos — são independentes da árvore e podem cobrir 1+ vãos ou a
// caixa inteira.
//
// Task 13.0 — terceiro modo "conjunto": lista de itens posicionados
// (`itens` + `alturas`, em vez de `box`), usado pelas telas da Stage 13
// (Ambientes/Paredes, Linhas de Proposta) pra desenhar N itens lado a lado
// numa mesma parede/faixa. Sempre "bonito" (sem interatividade, sem bordas
// técnicas — equivalente ao modo comercial), exceto pelo handle de junção
// (Task 13.2b).
//
// Task R.3b — decomposição pura (arquivo tinha 1.086 linhas, acima do teto
// `maxUiFileLines: 400`): geometria pura foi para
// `lib/engine/box/canvas-geometria.ts`, desenho de baixo nível para
// `lib/engine/box/canvas-desenho-partes.ts`, desenho do modo item único para
// `lib/engine/box/canvas-desenho-item-unico.ts`, desenho do modo conjunto
// para `lib/engine/box/canvas-desenho-conjunto.ts`, e as props públicas para
// `./BoxCanvas.types.ts`. Este arquivo agora só monta o componente React:
// hooks, hit-test de clique/hover e o `<canvas>`. Zero mudança de
// comportamento ou de aparência.
//
// Re-exports abaixo preservam o caminho de import `@/app/components/BoxCanvas`
// já usado pelos consumidores existentes (`EditorItemNucleo.tsx`,
// `LinhaPropostaCard.tsx`, `SecaoElevacaoConjunto.tsx`, `useConjuntos.ts`,
// `ElevacaoParede.tsx`, `ElevacaoParede.test.ts`, `PropostaLab.tsx`,
// `BoxCanvas.test.ts`).
export {
  geometriaConjunto,
  geometriaConjuntoBrackets,
  geometriaHandles,
} from "@/lib/engine/box/canvas-geometria";
export type {
  BoxCanvasProps,
  BoxCanvasPropsConjunto,
  BoxCanvasPropsItemUnico,
  DivisaoSelecionada,
  ItemDoConjunto,
  ModoSelecao,
} from "./BoxCanvas.types";

export function BoxCanvas(props: BoxCanvasProps) {
  const {
    box,
    itens,
    alturas,
    itensComAviso,
    conjuntos,
    onToggleJuncao,
    tagsComerciais,
    comercial: comercialProp = false,
    modoSelecao = "vaos",
    vaosSelecionados = [],
    onToggleVao,
    divisaoSelecionada = null,
    onSelecionarDivisoria,
    portaSelecionada = null,
    onSelecionarPorta,
    vaoGavetaSelecionado = null,
    onSelecionarVaoGaveta,
    onCanvasReady,
  } = props;
  // Conjunto é sempre "bonito"/não interativo por padrão (equivalente a
  // `comercial`) — a ÚNICA interatividade do modo conjunto é o handle de
  // junção (Task 13.2b), tratado à parte em `clique()`, não por este flag.
  const comercial = itens ? true : comercialProp;
  // Task 13.2b — só os handles são clicáveis no modo conjunto, e só quando
  // as duas props novas estão presentes (ver comentário de `onToggleJuncao`).
  const handlesInterativos = Boolean(itens && conjuntos && onToggleJuncao);
  const ref = useRef<HTMLCanvasElement>(null);
  // Vão sob o mouse (só nos modos "vaos"/"gavetas", que operam sobre os
  // mesmos retângulos de g.rects) — puramente apresentacional, não afeta
  // onToggleVao/modoSelecao/vaosSelecionados.
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Task 13.6a — entrega o `<canvas>` pro caller (ver comentário da prop).
  // Efeito PRÓPRIO, separado do de desenho abaixo: só precisa rodar quando a
  // referência do elemento muda (nunca, na prática, com `ref` de
  // `useRef` — o nó DOM é estável entre renders), mas roda a cada commit
  // desta função (`onCanvasReady` como única dependência) para não exigir
  // que o caller memoize um `ref` próprio.
  useEffect(() => {
    onCanvasReady?.(ref.current);
  }, [onCanvasReady]);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    if (itens && alturas) {
      desenharConjunto(ctx, itens, alturas, itensComAviso, conjuntos, tagsComerciais);
      return;
    }
    if (!box) return;

    desenharItemUnico(ctx, box, {
      comercial,
      modoSelecao,
      vaosSelecionados,
      divisaoSelecionada,
      portaSelecionada,
      vaoGavetaSelecionado,
      hoverId,
    });
  }, [box, itens, alturas, itensComAviso, conjuntos, tagsComerciais, comercial, modoSelecao, vaosSelecionados, divisaoSelecionada, portaSelecionada, vaoGavetaSelecionado, hoverId]);

  function clique(e: React.MouseEvent<HTMLCanvasElement>) {
    // Task 13.2b — modo conjunto: a ÚNICA exceção ao "não interativo" da Task
    // 13.0 é o handle de junção, e só quando `conjuntos`+`onToggleJuncao`
    // estão presentes juntas (`handlesInterativos`). Sem essas props novas, o
    // `return` abaixo preserva EXATAMENTE o comportamento anterior (nenhum
    // clique faz nada no modo conjunto) — não passa para o hit-test de `box`
    // logo em seguida, que não existe nesse modo (`box` é sempre `undefined`
    // quando `itens` está presente).
    if (itens && alturas) {
      if (handlesInterativos) {
        const canvas = ref.current;
        if (!canvas) return;
        const rectEl = canvas.getBoundingClientRect();
        const cx = ((e.clientX - rectEl.left) / rectEl.width) * W;
        const cy = ((e.clientY - rectEl.top) / rectEl.height) * H;
        for (const h of geometriaHandles(itens, alturas)) {
          const dx = cx - h.cx;
          const dy = cy - h.cy;
          if (dx * dx + dy * dy <= HANDLE_RAIO_PX * HANDLE_RAIO_PX) {
            onToggleJuncao?.(h.itemIdA, h.itemIdB);
            return;
          }
        }
      }
      return;
    }

    if (comercial || !box) return; // preview comercial não é interativo
    const canvas = ref.current;
    if (!canvas) return;
    const rectEl = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rectEl.left) / rectEl.width) * W;
    const cy = ((e.clientY - rectEl.top) / rectEl.height) * H;
    const g = geometria(box);
    const t = box.caixa.espessura;

    if (modoSelecao === "divisoes") {
      const PAD = 5;
      const divisorias: DivisoriaRect[] = layoutDivisorias(box.raiz, t, g.interiorTop, g.interiorW, g.interiorH, t);
      for (const d of divisorias) {
        const x = g.ox + d.x * g.scale;
        const y = g.oy + d.y * g.scale;
        const w = d.w * g.scale;
        const h = d.h * g.scale;
        if (cx >= x - PAD && cx <= x + w + PAD && cy >= y - PAD && cy <= y + h + PAD) {
          onSelecionarDivisoria?.({ parentId: d.parentId, indice: d.indice });
          return;
        }
      }
      return;
    }

    if (modoSelecao === "portas") {
      for (const grupo of box.portas) {
        const rectMm = retanguloDoGrupo(box, grupo, g, t);
        if (!rectMm) continue;
        const x = g.ox + rectMm.x * g.scale;
        const y = g.oy + rectMm.y * g.scale;
        const w = rectMm.w * g.scale;
        const h = rectMm.h * g.scale;
        if (cx >= x && cx <= x + w && cy >= y && cy <= y + h) {
          onSelecionarPorta?.(grupo.id);
          return;
        }
      }
      return;
    }

    if (modoSelecao === "gavetas") {
      for (const r of g.rects) {
        const x = g.ox + r.x * g.scale;
        const y = g.oy + r.y * g.scale;
        if (cx >= x && cx <= x + r.w * g.scale && cy >= y && cy <= y + r.h * g.scale) {
          onSelecionarVaoGaveta?.(r.id);
          return;
        }
      }
      return;
    }

    for (const r of g.rects) {
      const x = g.ox + r.x * g.scale;
      const y = g.oy + r.y * g.scale;
      if (cx >= x && cx <= x + r.w * g.scale && cy >= y && cy <= y + r.h * g.scale) {
        onToggleVao?.(r.id);
        return;
      }
    }
  }

  /** Só atualiza o vão sob o mouse (feedback visual de hover) — não dispara
   * nenhum callback de seleção. Restrito aos modos "vaos"/"gavetas", que
   * operam sobre os mesmos retângulos de g.rects. */
  function moverMouse(e: React.MouseEvent<HTMLCanvasElement>) {
    if (comercial || !box) return;
    if (modoSelecao !== "vaos" && modoSelecao !== "gavetas") {
      if (hoverId !== null) setHoverId(null);
      return;
    }
    const canvas = ref.current;
    if (!canvas) return;
    const rectEl = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rectEl.left) / rectEl.width) * W;
    const cy = ((e.clientY - rectEl.top) / rectEl.height) * H;
    const g = geometria(box);
    let encontrado: string | null = null;
    for (const r of g.rects) {
      const x = g.ox + r.x * g.scale;
      const y = g.oy + r.y * g.scale;
      if (cx >= x && cx <= x + r.w * g.scale && cy >= y && cy <= y + r.h * g.scale) {
        encontrado = r.id;
        break;
      }
    }
    if (encontrado !== hoverId) setHoverId(encontrado);
  }

  function sairMouse() {
    if (hoverId !== null) setHoverId(null);
  }

  return (
    <div className="max-w-full rounded-md border border-cinza-200 bg-cinza-50 p-2">
      <canvas
        ref={ref}
        width={W}
        height={H}
        onClick={clique}
        onMouseMove={moverMouse}
        onMouseLeave={sairMouse}
        style={{
          display: "block",
          width: "100%",
          maxWidth: W,
          height: "auto",
          // Task 13.2b — modo conjunto com handles interativos ganha cursor
          // pointer (feedback de clicabilidade dos handles), mesmo sendo
          // `comercial`; sem `handlesInterativos`, comportamento inalterado.
          cursor: comercial && !handlesInterativos ? "default" : "pointer",
        }}
      />
    </div>
  );
}
