"use client";

import type { ElementoParede, Parede } from "@/lib/engine/parede";
import type { AlturasFaixas } from "@/lib/engine/parede";
import type { ItemDoConjunto } from "@/app/components/BoxCanvas";
import { nomeDoItem } from "@/lib/orcamento";
import type { TagComercial } from "@/lib/linha-proposta/tipos";
import { CotasElevacao } from "./CotasElevacao";
import {
  AREA_H,
  AREA_W,
  CINZA_0,
  CINZA_200,
  CINZA_300,
  CINZA_400,
  CINZA_50,
  CINZA_500,
  CINZA_900,
  MARGIN_LEFT,
  MARGIN_TOP,
  ROTULO_ELEMENTO,
  ROTULO_FAIXA,
  SVG_H,
  SVG_W,
  TAG_BORDER,
  TAG_COR,
  TAG_SUBTLE,
} from "./ElevacaoParede.constants";
import { cotasFaixas, layoutElevacao, retanguloParaPx, retangulosDosItens } from "./ElevacaoParede.helpers";

// Task 13.2a — elevação 2D da parede: régua de largura + as 4 faixas
// (inferior/bancada/aéreo/torre) + elementos de parede (janela/porta/tomada/
// ponto hidráulico) desenhados como retângulos. Mesmo espírito de
// `geometriaConjunto` em `BoxCanvas.tsx`: geometria pura e testável separada
// do desenho (aqui em SVG, não Canvas 2D).
//
// Sistema de coordenadas dos DADOS (ElementoParede, AlturasFaixas): x cresce
// da esquerda pra direita, y cresce do CHÃO pra cima (mesmo referencial de
// `derivarY`/D-20). SVG cresce pra baixo — a conversão é feita em
// `retanguloParaPx`.
//
// Task R.5a — decomposição pura (zero mudança de comportamento/aparência,
// teto de 400 linhas/arquivo): geometria pura foi para
// `ElevacaoParede.helpers.ts`, tokens de layout/cor para
// `ElevacaoParede.constants.ts` e as 3 colunas de cota para
// `CotasElevacao.tsx`. Este arquivo reexporta a geometria (mesmo padrão de
// `AmbientesLab.tsx` → `AmbientesLab.helpers.ts`) para não quebrar
// `ElevacaoParede.test.ts`.
export * from "./ElevacaoParede.helpers";

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
  /** Task 2.28-2.30 (RF-37/Q-3) — itemId -> Linha de Proposta (agrupamento
   * comercial) a que pertence, derivado por `AmbientesLab.tsx::
   * derivarTagsComerciais`. Opcional/vazio: nenhum badge desenhado (mesmo
   * comportamento de antes desta task) — regra de ruído (só 2+ linhas)
   * já resolvida por quem deriva o mapa, não aqui. */
  tagsComerciais?: Map<string, TagComercial>;
}

/** Trunca o título da Linha de Proposta pro chip caber num item pequeno —
 * só apresentacional, o título completo continua na aba Proposta. */
function tituloAbreviado(titulo: string): string {
  return titulo.length > 12 ? `${titulo.slice(0, 11)}…` : titulo;
}

/** Task 2.28-2.30 — chip do badge comercial: pílula preenchida (`TAG_SUBTLE`/
 * `TAG_COR`), forma e cor diferentes do colchete/handle de Conjunto (linha +
 * círculo em `informacao`, ver comentário de `TAG_COR` em
 * `ElevacaoParede.constants.ts`). */
function TagComercialBadge({ tag, x, y, maxW }: { tag: TagComercial; x: number; y: number; maxW: number }) {
  const label = tituloAbreviado(tag.titulo);
  const chipW = Math.max(20, Math.min(maxW, label.length * 5.5 + 14));
  return (
    <g>
      <rect x={x} y={y} width={chipW} height={14} rx={7} fill={TAG_SUBTLE} stroke={TAG_BORDER} />
      <text x={x + chipW / 2} y={y + 10} textAnchor="middle" fontSize={9} fill={TAG_COR}>
        {label}
      </text>
    </g>
  );
}

export function ElevacaoParede({
  parede,
  alturas,
  itens,
  onClicarElemento,
  tagsComerciais,
}: ElevacaoParedeProps) {
  const layout = layoutElevacao(parede, alturas, AREA_W, AREA_H);
  const x0 = MARGIN_LEFT + (AREA_W - layout.larguraPx) / 2;
  const y0 = MARGIN_TOP + (AREA_H - layout.alturaPx); // alinhado ao chão

  const paraSvgY = (mmY: number) => y0 + layout.alturaPx - mmY * layout.scale;

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

      <CotasElevacao
        parede={parede}
        alturas={alturas}
        cotasPorFaixa={cotasFaixas(layout.bandas)}
        larguraPx={layout.larguraPx}
        paraSvgY={paraSvgY}
        x0={x0}
      />

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
              {rect.w > 24 && rect.h > 18 && tagsComerciais?.get(d.item.posicao.itemId) && (
                <TagComercialBadge
                  tag={tagsComerciais.get(d.item.posicao.itemId)!}
                  x={x0 + rect.x + 3}
                  y={svgY + 3}
                  maxW={rect.w - 6}
                />
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
              {rect.w > 24 && rect.h > 18 && tagsComerciais?.get(d.item.posicao.itemId) && (
                <TagComercialBadge
                  tag={tagsComerciais.get(d.item.posicao.itemId)!}
                  x={x0 + rect.x + 3}
                  y={svgY + 3}
                  maxW={rect.w - 6}
                />
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
