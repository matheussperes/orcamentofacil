import type { AlturasFaixas, Parede } from "@/lib/engine/parede";
import type { CotaFaixa } from "./ElevacaoParede.helpers";
import { CINZA_400, CINZA_500, CINZA_700, ROTULO_FAIXA } from "./ElevacaoParede.constants";

/** Task R.5a — extraído de `ElevacaoParede.tsx` (decomposição pura, teto de
 * 400 linhas/arquivo, zero mudança visual): as 3 colunas de cota à direita
 * da parede (altura total, altura por faixa, bracket "torre") — mesmo
 * traço linha+seta+rótulo rotacionado das Tasks 2.27/13.2a, só reorganizado
 * em componente próprio. */
export function CotasElevacao({
  parede,
  alturas,
  cotasPorFaixa,
  larguraPx,
  paraSvgY,
  x0,
}: {
  parede: Pick<Parede, "altura">;
  alturas: AlturasFaixas;
  cotasPorFaixa: CotaFaixa[];
  larguraPx: number;
  paraSvgY: (mmY: number) => number;
  x0: number;
}) {
  const xDireita = x0 + larguraPx;

  return (
    <>
      {/* Cota de altura total da parede (Task 2.27, RF-27) — coluna mais
          próxima do contorno. Fonte: `parede.altura` (altura física real),
          não `alturas.peDireito` (que é só o limite de instalação do aéreo,
          ver comentário de `TETO_DA_FAIXA` em lib/engine/parede/validar.ts —
          os dois podem divergir). */}
      <g>
        <line x1={xDireita + 16} y1={paraSvgY(0)} x2={xDireita + 16} y2={paraSvgY(parede.altura)} stroke={CINZA_400} />
        <line x1={xDireita + 12} y1={paraSvgY(0)} x2={xDireita + 20} y2={paraSvgY(0)} stroke={CINZA_400} />
        <line
          x1={xDireita + 12}
          y1={paraSvgY(parede.altura)}
          x2={xDireita + 20}
          y2={paraSvgY(parede.altura)}
          stroke={CINZA_400}
        />
        <text
          x={xDireita + 26}
          y={(paraSvgY(0) + paraSvgY(parede.altura)) / 2}
          fontSize={12}
          fill={CINZA_700}
          className="tabular-nums"
          transform={`rotate(-90, ${xDireita + 26}, ${(paraSvgY(0) + paraSvgY(parede.altura)) / 2})`}
          textAnchor="middle"
        >
          {parede.altura} mm
        </text>
      </g>

      {/* Cota de altura de cada faixa (inferior/meio/aéreo) — Task 2.27,
          coluna do meio, uma cota curta ao lado de cada banda. */}
      {cotasPorFaixa.map((c) => (
        <g key={`cota-${c.faixa}`}>
          <line x1={xDireita + 40} y1={paraSvgY(c.yBase)} x2={xDireita + 40} y2={paraSvgY(c.yTopo)} stroke={CINZA_400} />
          <line x1={xDireita + 36} y1={paraSvgY(c.yBase)} x2={xDireita + 44} y2={paraSvgY(c.yBase)} stroke={CINZA_400} />
          <line x1={xDireita + 36} y1={paraSvgY(c.yTopo)} x2={xDireita + 44} y2={paraSvgY(c.yTopo)} stroke={CINZA_400} />
          <text
            x={xDireita + 50}
            y={(paraSvgY(c.yBase) + paraSvgY(c.yTopo)) / 2}
            fontSize={11}
            fill={CINZA_700}
            className="tabular-nums"
            transform={`rotate(-90, ${xDireita + 50}, ${(paraSvgY(c.yBase) + paraSvgY(c.yTopo)) / 2})`}
            textAnchor="middle"
          >
            {c.altura} mm
          </text>
        </g>
      ))}

      {/* Bracket vertical indicando a faixa "torre" (chão -> pé-direito) —
          não é uma banda horizontal (ver comentário de `bandasFaixas`).
          Coluna mais externa, deslocada para não colidir com as cotas
          acima (Task 2.27). */}
      <g>
        <line x1={xDireita + 64} y1={paraSvgY(0)} x2={xDireita + 64} y2={paraSvgY(alturas.peDireito)} stroke={CINZA_400} />
        <line x1={xDireita + 60} y1={paraSvgY(0)} x2={xDireita + 68} y2={paraSvgY(0)} stroke={CINZA_400} />
        <line
          x1={xDireita + 60}
          y1={paraSvgY(alturas.peDireito)}
          x2={xDireita + 68}
          y2={paraSvgY(alturas.peDireito)}
          stroke={CINZA_400}
        />
        <text
          x={xDireita + 78}
          y={(paraSvgY(0) + paraSvgY(alturas.peDireito)) / 2}
          fontSize={12}
          fill={CINZA_500}
          transform={`rotate(-90, ${xDireita + 78}, ${(paraSvgY(0) + paraSvgY(alturas.peDireito)) / 2})`}
          textAnchor="middle"
        >
          {ROTULO_FAIXA.torre}
        </text>
      </g>
    </>
  );
}
