"use client";

import type { AlturasFaixas, ElementoParede, Faixa, Parede } from "@/lib/engine/parede";
import { derivarY } from "@/lib/engine/parede";
import type { ItemDoConjunto } from "@/app/components/BoxCanvas";
import { alturaDoItem, larguraDoItem, nomeDoItem } from "@/lib/orcamento";

// Task 13.2a — elevação 2D da parede: régua de largura + as 4 faixas
// (inferior/bancada/aéreo/torre) + elementos de parede (janela/porta/tomada/
// ponto hidráulico) desenhados como retângulos. Componente NOVO — não existe
// hoje nada que desenhe faixas/elementos (o `BoxCanvas` modo conjunto, Task
// 13.0, só desenha os ITENS posicionados, não a parede em si). Mesmo espírito
// de `geometriaConjunto` em `BoxCanvas.tsx`: geometria pura e testável
// separada do desenho (aqui em SVG, não Canvas 2D — não há necessidade de
// pixel-manipulação, e SVG permite texto/linhas nítidos em qualquer DPI sem
// código extra).
//
// Sistema de coordenadas dos DADOS (ElementoParede, AlturasFaixas): x cresce
// da esquerda pra direita, y cresce do CHÃO pra cima (mesmo referencial de
// `derivarY`/D-20). SVG cresce pra baixo — a conversão é feita em
// `retanguloParaPx`.

export interface FaixaBanda {
  faixa: Faixa;
  y0: number;
  y1: number;
}

// "torre" não é uma banda horizontal distinta — ocupa do chão ao pé-direito
// por natureza (mesma decisão de `derivarY`/`TETO_DA_FAIXA` em
// lib/engine/parede/validar.ts). Por isso as 3 bandas empilhadas cobrem só
// inferior/bancada/aereo; "torre" é indicada à parte por um bracket vertical
// de altura inteira (ver `BracketTorre` no componente), não por uma 4ª banda
// com limites próprios que não existem no modelo de domínio.
export function bandasFaixas(alturas: AlturasFaixas): FaixaBanda[] {
  return [
    { faixa: "inferior", y0: 0, y1: alturas.alturaBancada },
    { faixa: "bancada", y0: alturas.alturaBancada, y1: alturas.alturaInstalacaoAereo },
    { faixa: "aereo", y0: alturas.alturaInstalacaoAereo, y1: alturas.peDireito },
  ];
}

export interface ItemDesenhado {
  item: ItemDoConjunto;
  rect: { x: number; y: number; w: number; h: number }; // em mm, coords de DADOS
}

/** Geometria pura dos módulos posicionados (`parede.itens`), mesma fonte de
 * verdade do resto do motor (`derivarY`/`larguraDoItem`/`alturaDoItem`) — sem
 * fórmula nova, só empacota o retângulo em mm pra `retanguloParaPx` desenhar. */
export function retangulosDosItens(itens: ItemDoConjunto[], alturas: AlturasFaixas): ItemDesenhado[] {
  return itens.map((it) => ({
    item: it,
    rect: {
      x: it.posicao.x,
      y: derivarY(it.posicao.faixa, alturas),
      w: larguraDoItem(it.item),
      h: alturaDoItem(it.item),
    },
  }));
}

export interface CotaFaixa {
  faixa: Faixa;
  altura: number; // mm — y1 - y0 da banda
  yBase: number; // mm
  yTopo: number; // mm
}

// Task 2.27 (RF-27) — geometria pura das cotas de altura por faixa, extraída
// para ser testável sem SVG: cada banda já traz seus limites (`bandasFaixas`
// acima), aqui só empacota o valor cotado (`y1 - y0`) junto com os limites
// em mm que o desenho usa pra posicionar linha/seta/rótulo.
export function cotasFaixas(bandas: FaixaBanda[]): CotaFaixa[] {
  return bandas.map((b) => ({ faixa: b.faixa, altura: b.y1 - b.y0, yBase: b.y0, yTopo: b.y1 }));
}

export interface LayoutElevacao {
  scale: number;
  larguraPx: number;
  alturaPx: number;
  bandas: FaixaBanda[];
}

/** Geometria pura: escala que cabe a parede (largura x altura, mm) numa
 * caixa de `maxW`×`maxH` px, preservando proporção — mesma ideia de
 * `geometria(box)`/`geometriaConjunto` em BoxCanvas.tsx. Guard contra
 * parede com dimensão zero/negativa (evita Infinity/NaN propagando pro
 * desenho). */
export function layoutElevacao(
  parede: Pick<Parede, "largura" | "altura">,
  alturas: AlturasFaixas,
  maxW: number,
  maxH: number
): LayoutElevacao {
  const scale =
    parede.largura > 0 && parede.altura > 0 ? Math.min(maxW / parede.largura, maxH / parede.altura) : 0;
  return {
    scale,
    larguraPx: parede.largura * scale,
    alturaPx: parede.altura * scale,
    bandas: bandasFaixas(alturas),
  };
}

/** Converte um retângulo em coordenadas de DADOS (mm; y cresce do chão pra
 * cima) para um retângulo em pixels SVG (y cresce do topo pra baixo),
 * usando a escala/altura já resolvidas por `layoutElevacao`. Reaproveitada
 * tanto pelos elementos de parede quanto pelas bandas de faixa. */
export function retanguloParaPx(
  x: number,
  y: number,
  w: number,
  h: number,
  layout: Pick<LayoutElevacao, "scale" | "alturaPx">
): { x: number; y: number; w: number; h: number } {
  return {
    x: x * layout.scale,
    y: layout.alturaPx - (y + h) * layout.scale,
    w: w * layout.scale,
    h: h * layout.scale,
  };
}

const ROTULO_FAIXA: Record<Faixa, string> = {
  inferior: "Inferior",
  bancada: "Meio",
  aereo: "Aéreo",
  torre: "Torre",
};

const ROTULO_ELEMENTO: Record<ElementoParede["tipo"], string> = {
  janela: "Janela",
  porta: "Porta",
  tomada: "Tomada",
  ponto_hidraulico: "Hidráulico",
  // [Task 2.7] só satisfaz a exaustividade do Record — UI de "pedra" fica
  // fora do escopo desta task de motor puro.
  pedra: "Pedra",
};

// Layout do SVG: margens reservadas pros rótulos de banda (esquerda), régua
// de largura (topo) e bracket de "torre" (direita). Cores hardcoded em hex
// porque é desenho SVG, não classe Tailwind — mesmos tokens hex do Design-
// System (Seção 2.1 neutros / 2.2 accent), mesmo padrão já documentado no
// topo de BoxCanvas.tsx.
const SVG_W = 640;
const SVG_H = 380;
const MARGIN_LEFT = 92;
const MARGIN_TOP = 40;
// Task 2.27 — margem alargada de 56 para 100: 3 colunas de cota empilhadas
// à direita da parede (altura total / altura de cada faixa / bracket da
// torre), cada uma com linha + seta + rótulo rotacionado, sem colidir.
const MARGIN_RIGHT = 100;
const MARGIN_BOTTOM = 16;
const AREA_W = SVG_W - MARGIN_LEFT - MARGIN_RIGHT;
const AREA_H = SVG_H - MARGIN_TOP - MARGIN_BOTTOM;

const CINZA_900 = "#0F172A";
const CINZA_700 = "#334155";
const CINZA_500 = "#64748B";
const CINZA_400 = "#94A3B8";
const CINZA_300 = "#CBD5E1";
const CINZA_200 = "#E2E8F0";
const CINZA_50 = "#F8FAFC";
const CINZA_0 = "#FFFFFF";

export interface ElevacaoParedeProps {
  parede: Parede;
  alturas: AlturasFaixas;
  /** Task 2.24-2.26 — módulos/placas já posicionados na parede (mesma
   * derivação `itensDoConjunto` que alimenta o `BoxCanvas` modo conjunto em
   * AmbientesLab.tsx, não recalculada aqui). */
  itens: ItemDoConjunto[];
  /** Task 2.7-2.11 (front) — clicar num elemento desenhado entra no mesmo
   * modo de edição inline do botão de lápis na lista (convergem no mesmo
   * estado, ver AmbientesLab.tsx). Opcional: sem handler, o elemento
   * continua só desenho, sem afordância de clique. */
  onClicarElemento?: (elemento: ElementoParede, indice: number) => void;
}

export function ElevacaoParede({ parede, alturas, itens, onClicarElemento }: ElevacaoParedeProps) {
  const layout = layoutElevacao(parede, alturas, AREA_W, AREA_H);
  const x0 = MARGIN_LEFT + (AREA_W - layout.larguraPx) / 2;
  const y0 = MARGIN_TOP + (AREA_H - layout.alturaPx); // alinhado ao chão

  const paraSvgY = (mmY: number) => y0 + layout.alturaPx - mmY * layout.scale;
  const paraSvgX = (mmX: number) => x0 + mmX * layout.scale;

  if (layout.scale === 0) {
    return (
      <p className="text-corpo-pequeno text-cinza-500">
        Informe largura e altura da parede (maiores que zero) para desenhar a elevação.
      </p>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full max-w-full"
      role="img"
      aria-label="Elevação da parede com faixas, módulos posicionados e elementos"
    >
      {/* Régua de largura (topo) */}
      <line x1={x0} y1={MARGIN_TOP - 14} x2={x0 + layout.larguraPx} y2={MARGIN_TOP - 14} stroke={CINZA_400} />
      <line x1={x0} y1={MARGIN_TOP - 18} x2={x0} y2={MARGIN_TOP - 10} stroke={CINZA_400} />
      <line
        x1={x0 + layout.larguraPx}
        y1={MARGIN_TOP - 18}
        x2={x0 + layout.larguraPx}
        y2={MARGIN_TOP - 10}
        stroke={CINZA_400}
      />
      <text
        x={x0 + layout.larguraPx / 2}
        y={MARGIN_TOP - 22}
        textAnchor="middle"
        fontSize={12}
        fill={CINZA_500}
      >
        {parede.largura} mm
      </text>

      {/* Bandas das faixas inferior/bancada/aereo, zebradas + rótulo à esquerda */}
      {layout.bandas.map((banda, i) => {
        const rect = retanguloParaPx(0, banda.y0, parede.largura, banda.y1 - banda.y0, layout);
        return (
          <g key={banda.faixa}>
            <rect
              x={x0}
              y={y0 + rect.y}
              width={layout.larguraPx}
              height={rect.h}
              fill={i % 2 === 0 ? CINZA_0 : CINZA_50}
              stroke={CINZA_200}
            />
            <text
              x={x0 - 8}
              y={paraSvgY((banda.y0 + banda.y1) / 2) + 4}
              textAnchor="end"
              fontSize={12}
              fill={CINZA_500}
            >
              {ROTULO_FAIXA[banda.faixa]}
            </text>
          </g>
        );
      })}

      {/* Contorno da parede */}
      <rect x={x0} y={y0} width={layout.larguraPx} height={layout.alturaPx} fill="none" stroke={CINZA_300} strokeWidth={2} />

      {/* Cota de altura total da parede (Task 2.27, RF-27) — coluna mais
          próxima do contorno. Fonte: `parede.altura` (altura física real),
          não `alturas.peDireito` (que é só o limite de instalação do aéreo,
          ver comentário de `TETO_DA_FAIXA` em lib/engine/parede/validar.ts —
          os dois podem divergir). Mesmo padrão de linha/seta/rótulo da régua
          de largura acima (linhas 187–204). */}
      <g>
        <line
          x1={x0 + layout.larguraPx + 16}
          y1={paraSvgY(0)}
          x2={x0 + layout.larguraPx + 16}
          y2={paraSvgY(parede.altura)}
          stroke={CINZA_400}
        />
        <line
          x1={x0 + layout.larguraPx + 12}
          y1={paraSvgY(0)}
          x2={x0 + layout.larguraPx + 20}
          y2={paraSvgY(0)}
          stroke={CINZA_400}
        />
        <line
          x1={x0 + layout.larguraPx + 12}
          y1={paraSvgY(parede.altura)}
          x2={x0 + layout.larguraPx + 20}
          y2={paraSvgY(parede.altura)}
          stroke={CINZA_400}
        />
        <text
          x={x0 + layout.larguraPx + 26}
          y={(paraSvgY(0) + paraSvgY(parede.altura)) / 2}
          fontSize={12}
          fill={CINZA_700}
          className="tabular-nums"
          transform={`rotate(-90, ${x0 + layout.larguraPx + 26}, ${
            (paraSvgY(0) + paraSvgY(parede.altura)) / 2
          })`}
          textAnchor="middle"
        >
          {parede.altura} mm
        </text>
      </g>

      {/* Cota de altura de cada faixa (inferior/meio/aéreo) — Task 2.27,
          coluna do meio, uma cota curta ao lado de cada banda. */}
      {cotasFaixas(layout.bandas).map((c) => (
        <g key={`cota-${c.faixa}`}>
          <line
            x1={x0 + layout.larguraPx + 40}
            y1={paraSvgY(c.yBase)}
            x2={x0 + layout.larguraPx + 40}
            y2={paraSvgY(c.yTopo)}
            stroke={CINZA_400}
          />
          <line
            x1={x0 + layout.larguraPx + 36}
            y1={paraSvgY(c.yBase)}
            x2={x0 + layout.larguraPx + 44}
            y2={paraSvgY(c.yBase)}
            stroke={CINZA_400}
          />
          <line
            x1={x0 + layout.larguraPx + 36}
            y1={paraSvgY(c.yTopo)}
            x2={x0 + layout.larguraPx + 44}
            y2={paraSvgY(c.yTopo)}
            stroke={CINZA_400}
          />
          <text
            x={x0 + layout.larguraPx + 50}
            y={(paraSvgY(c.yBase) + paraSvgY(c.yTopo)) / 2}
            fontSize={11}
            fill={CINZA_700}
            className="tabular-nums"
            transform={`rotate(-90, ${x0 + layout.larguraPx + 50}, ${
              (paraSvgY(c.yBase) + paraSvgY(c.yTopo)) / 2
            })`}
            textAnchor="middle"
          >
            {c.altura} mm
          </text>
        </g>
      ))}

      {/* Bracket vertical indicando a faixa "torre" (chão -> pé-direito) —
          não é uma banda horizontal (ver comentário de `bandasFaixas`).
          Coluna mais externa, deslocada para não colidir com as cotas
          novas acima (Task 2.27). */}
      <g>
        <line
          x1={x0 + layout.larguraPx + 64}
          y1={paraSvgY(0)}
          x2={x0 + layout.larguraPx + 64}
          y2={paraSvgY(alturas.peDireito)}
          stroke={CINZA_400}
        />
        <line
          x1={x0 + layout.larguraPx + 60}
          y1={paraSvgY(0)}
          x2={x0 + layout.larguraPx + 68}
          y2={paraSvgY(0)}
          stroke={CINZA_400}
        />
        <line
          x1={x0 + layout.larguraPx + 60}
          y1={paraSvgY(alturas.peDireito)}
          x2={x0 + layout.larguraPx + 68}
          y2={paraSvgY(alturas.peDireito)}
          stroke={CINZA_400}
        />
        <text
          x={x0 + layout.larguraPx + 78}
          y={(paraSvgY(0) + paraSvgY(alturas.peDireito)) / 2}
          fontSize={12}
          fill={CINZA_500}
          transform={`rotate(-90, ${x0 + layout.larguraPx + 78}, ${
            (paraSvgY(0) + paraSvgY(alturas.peDireito)) / 2
          })`}
          textAnchor="middle"
        >
          {ROTULO_FAIXA.torre}
        </text>
      </g>

      {/* Módulos posicionados (parede.itens): torre desenhada PRIMEIRO (para
          trás na ordem de pintura SVG) — ocupa fisicamente o mesmo X que
          módulos das outras 3 faixas podem ocupar (Modelo-de-Dominio A-09) —
          com estilo tracejado/discreto sinalizando "estrutura de fundo".
          Módulos não-torre desenhados depois, por cima, com retângulo cheio
          e borda mais forte. */}
      {retangulosDosItens(itens, alturas)
        .filter((d) => d.item.posicao.faixa === "torre")
        .map((d) => {
          const rect = retanguloParaPx(d.rect.x, d.rect.y, d.rect.w, d.rect.h, layout);
          const svgY = y0 + rect.y;
          return (
            <g key={`torre-${d.item.posicao.itemId}`}>
              <rect
                x={x0 + rect.x}
                y={svgY}
                width={rect.w}
                height={rect.h}
                fill={CINZA_50}
                fillOpacity={0.5}
                stroke={CINZA_400}
                strokeDasharray="2 2"
              />
              {rect.w > 30 && rect.h > 14 && (
                <text
                  x={x0 + rect.x + rect.w / 2}
                  y={svgY + rect.h / 2 + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill={CINZA_900}
                >
                  {nomeDoItem(d.item.item)}
                </text>
              )}
            </g>
          );
        })}

      {retangulosDosItens(itens, alturas)
        .filter((d) => d.item.posicao.faixa !== "torre")
        .map((d) => {
          const rect = retanguloParaPx(d.rect.x, d.rect.y, d.rect.w, d.rect.h, layout);
          const svgY = y0 + rect.y;
          return (
            <g key={`modulo-${d.item.posicao.itemId}`}>
              <rect
                x={x0 + rect.x}
                y={svgY}
                width={rect.w}
                height={rect.h}
                fill={CINZA_0}
                stroke={CINZA_400}
                strokeWidth={1.5}
              />
              {rect.w > 30 && rect.h > 14 && (
                <text
                  x={x0 + rect.x + rect.w / 2}
                  y={svgY + rect.h / 2 + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill={CINZA_900}
                >
                  {nomeDoItem(d.item.item)}
                </text>
              )}
            </g>
          );
        })}

      {/* Elementos de parede: retângulo técnico (tracejado) + rótulo. Sem
          paleta por tipo — Design System não define cores por categoria de
          elemento; usa só a escala de cinza (Seção 2.1), diferenciando por
          rótulo de texto, igual ao vão técnico do BoxCanvas modo laboratório. */}
      {parede.elementos.map((el, i) => {
        const rect = retanguloParaPx(el.x, el.y, el.largura, el.altura, layout);
        const svgY = y0 + rect.y;
        const clicavel = Boolean(onClicarElemento);
        return (
          <g
            key={el.id}
            className={clicavel ? "cursor-pointer" : undefined}
            role={clicavel ? "button" : undefined}
            tabIndex={clicavel ? 0 : undefined}
            aria-label={clicavel ? `Editar elemento ${ROTULO_ELEMENTO[el.tipo]}` : undefined}
            onClick={clicavel ? () => onClicarElemento?.(el, i) : undefined}
            onKeyDown={
              clicavel
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onClicarElemento?.(el, i);
                    }
                  }
                : undefined
            }
          >
            <rect
              x={x0 + rect.x}
              y={svgY}
              width={rect.w}
              height={rect.h}
              fill={CINZA_200}
              fillOpacity={0.6}
              stroke={CINZA_400}
              strokeDasharray="4 3"
            />
            {rect.w > 30 && rect.h > 14 && (
              <text
                x={x0 + rect.x + rect.w / 2}
                y={svgY + rect.h / 2 + 4}
                textAnchor="middle"
                fontSize={11}
                fill={CINZA_900}
              >
                {ROTULO_ELEMENTO[el.tipo]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
