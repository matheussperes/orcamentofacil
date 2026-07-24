import { consolidarResultados } from "../consolidar";
import type { EngineOutput, ResultadoModulo } from "../types";
import { explodeBox } from "./explode";
import type { BoxModule } from "./types";

export * from "./types";
export { explodeBox } from "./explode";

/**
 * Calcula um orçamento a partir de módulos-caixa (V3), produzindo a MESMA
 * estrutura EngineOutput do motor de templates — assim o pipeline de custos,
 * a lista de insumos e a proposta funcionam sem alteração.
 */
export function calcularOrcamentoBox(
  boxes: BoxModule[],
  perdaMdf: number
): EngineOutput {
  const porModulo: ResultadoModulo[] = boxes.map((box) => {
    const r = explodeBox(box);
    return {
      moduloId: box.id,
      templateCodigo: box.tipo.toUpperCase(),
      nome: box.nome,
      pecas: r.pecas,
      ferragens: r.ferragens,
      areaMdfM2: r.areaMdfM2,
      fitaM: r.fitaM,
    };
  });

  // Elementos contínuos (tampo/rodapé de parede) ficam para um próximo
  // incremento no fluxo box; por ora o box já traz seu próprio rodapé (torre).
  const consolidado = consolidarResultados(porModulo, [], perdaMdf);
  return { porModulo, globais: [], consolidado, warnings: [] };
}
