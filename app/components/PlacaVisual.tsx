"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LadoPlaca } from "@/lib/engine/placa/types";
import type { SentidoVeio } from "@/lib/engine/types";

// Task 13.1 — referência visual da Placa (Modelo de Domínio Seção 2.1.1 +
// Seção 8). Componente NOVO, simples (retângulo com proporção da face da
// placa) — não reaproveita nem duplica a lógica de desenho de `BoxCanvas`
// (que resolve árvore de vãos recursiva; Placa não tem vãos). Dois usos
// combinados na mesma referência visual, conforme o contrato:
//   1. Seleção dos lados a engrossar (`lados`/`onToggleLado`) — só
//      interativo quando a técnica é "engrossada" (`ladosInterativos`).
//   2. Indicador de sentido do veio (`sentidoVeio`/`onInverterVeio`) — só
//      visível quando `temVeio` é true.
const LARGURA_MAX_PX = 320;
const ALTURA_MAX_PX = 240;
const PAD = 28;

const LADOS: LadoPlaca[] = ["superior", "inferior", "esquerda", "direita"];
const RÓTULO_LADO: Record<LadoPlaca, string> = {
  superior: "Superior",
  inferior: "Inferior",
  esquerda: "Esquerda",
  direita: "Direita",
};

export function PlacaVisual({
  largura,
  altura,
  lados = [],
  ladosInterativos = false,
  onToggleLado,
  temVeio = false,
  sentidoVeio = "comprimento",
  onInverterVeio,
}: {
  largura: number;
  altura: number;
  /** Lados atualmente selecionados para engrossamento (Seção 2.1.1). */
  lados?: LadoPlaca[];
  /** true quando `engrossamento.tecnica === "engrossada"` — só aí faz
   * sentido clicar nos lados (técnica "dobrada" não tem `lados`). */
  ladosInterativos?: boolean;
  onToggleLado?: (lado: LadoPlaca) => void;
  /** Placa.material.temVeio — controla se o indicador de veio aparece. */
  temVeio?: boolean;
  sentidoVeio?: SentidoVeio;
  onInverterVeio?: () => void;
}) {
  const larguraSafe = Math.max(largura, 1);
  const alturaSafe = Math.max(altura, 1);
  const escala = Math.min(
    (LARGURA_MAX_PX - PAD * 2) / larguraSafe,
    (ALTURA_MAX_PX - PAD * 2) / alturaSafe
  );
  const w = larguraSafe * escala;
  const h = alturaSafe * escala;
  const svgW = w + PAD * 2;
  const svgH = h + PAD * 2;
  const x0 = PAD;
  const y0 = PAD;

  const selecionados = new Set(lados);
  const faixa = 18; // espessura visual da faixa clicável de cada lado, em px

  function bandProps(lado: LadoPlaca): { x: number; y: number; w: number; h: number } {
    switch (lado) {
      case "superior":
        return { x: x0, y: y0, w, h: faixa };
      case "inferior":
        return { x: x0, y: y0 + h - faixa, w, h: faixa };
      case "esquerda":
        return { x: x0, y: y0, w: faixa, h };
      case "direita":
        return { x: x0 + w - faixa, y: y0, w: faixa, h };
    }
  }

  // Sentido "comprimento" = veio corre no eixo da LARGURA (horizontal) —
  // orientação natural de largura_mm/altura_mm (lib/engine/types.ts,
  // comentário de SentidoVeio). "largura" = eixo da ALTURA (vertical).
  const veioHorizontal = sentidoVeio === "comprimento";

  return (
    <div className="flex flex-col items-center gap-sm">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="h-auto w-full"
        style={{ maxWidth: svgW }}
        role="group"
        aria-label={`Referência visual da placa, ${largura}×${altura}mm`}
      >
        {/* Task 13.1 (correção pós-validação do Maestro) — de propósito SEM
            atributos HTML `width`/`height` no <svg>: um elemento substituído
            (SVG/img) com `width`/`height` fixos em px participa do cálculo de
            min-content do grid mesmo com `max-width:100%` em CSS — o legacy
            `.grid`/`.card` deste projeto não tem `min-width: 0` nos itens
            (mesma causa-raiz já documentada e corrigida na Task 6.3b para
            `BoxModuloCard`/`TemplateModuloCard` em app/page.tsx), então o
            track inteiro crescia pra acomodar o tamanho intrínseco do SVG —
            "grid blowout", confirmado por medição (374px vs 335px no modo
            box, overflow horizontal real em 375px). Fix: só `viewBox` define
            a proporção; o tamanho renderizado vem 100% de CSS (`w-full
            h-auto`, com `maxWidth: svgW` — o teto em desktop — via `style`
            porque é um valor calculado por instância, não um token do Design
            System). Sem width/height attribute, o navegador deriva o aspect
            ratio do próprio viewBox (SVG2), então `h-auto` continua correto.

            `role="group"` (não "img") no <svg> também de propósito: um <svg
            role="img"> colapsa os filhos na árvore de acessibilidade (e em
            ferramentas baseadas nela), escondendo os `<rect>` clicáveis dos
            lados — achado durante a validação visual desta task. "group"
            mantém o nome acessível do conjunto sem esconder os botões dos
            lados. */}
        <rect
          x={x0}
          y={y0}
          width={w}
          height={h}
          className="fill-cinza-0"
          stroke="#94A3B8"
          strokeWidth={1.5}
        />

        {temVeio && (
          <g>
            {veioHorizontal ? (
              <line
                x1={x0 + 10}
                y1={y0 + h / 2}
                x2={x0 + w - 10}
                y2={y0 + h / 2}
                stroke="#2563EB"
                strokeWidth={2}
                markerStart="url(#veio-seta)"
                markerEnd="url(#veio-seta)"
              />
            ) : (
              <line
                x1={x0 + w / 2}
                y1={y0 + 10}
                x2={x0 + w / 2}
                y2={y0 + h - 10}
                stroke="#2563EB"
                strokeWidth={2}
                markerStart="url(#veio-seta)"
                markerEnd="url(#veio-seta)"
              />
            )}
            <defs>
              <marker
                id="veio-seta"
                markerWidth={8}
                markerHeight={8}
                refX={4}
                refY={4}
                orient="auto-start-reverse"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="#2563EB" />
              </marker>
            </defs>
          </g>
        )}

        {LADOS.map((lado) => {
          const b = bandProps(lado);
          const ativo = selecionados.has(lado);
          return (
            <rect
              key={lado}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              className={
                ativo
                  ? "fill-accent-subtle stroke-accent"
                  : ladosInterativos
                    ? "fill-transparent stroke-transparent hover:fill-cinza-100"
                    : "fill-transparent stroke-transparent"
              }
              strokeWidth={1.5}
              style={{ cursor: ladosInterativos ? "pointer" : "default" }}
              onClick={ladosInterativos ? () => onToggleLado?.(lado) : undefined}
              role={ladosInterativos ? "button" : undefined}
              aria-pressed={ladosInterativos ? ativo : undefined}
              aria-label={ladosInterativos ? `Engrossar lado ${RÓTULO_LADO[lado]}` : undefined}
            />
          );
        })}

        <text
          x={x0 + w / 2}
          y={y0 + h + 16}
          textAnchor="middle"
          className="fill-cinza-500"
          style={{ fontSize: 11 }}
        >
          {largura}×{altura}mm
        </text>
      </svg>

      {ladosInterativos && (
        <p className="text-legenda text-cinza-500">
          Clique nos lados da placa para engrossar/remover.
        </p>
      )}

      {temVeio && (
        <Button variant="ghost" size="sm" onClick={onInverterVeio}>
          <RefreshCw size={12} />
          Inverter sentido do veio ({sentidoVeio})
        </Button>
      )}
    </div>
  );
}
