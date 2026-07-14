import { calcularEngine, consolidarResultados } from "./engine/engine";
import { explodeBox } from "./engine/box";
import type { BoxModule } from "./engine/box/types";
import type {
  EngineOutput,
  MateriaisAmbiente,
  ModuloInstanciado,
  ModuloTemplate,
  ParametrosFabrica,
  ResultadoModulo,
} from "./engine/types";

// Orçamento misto: combina módulos baseados em template (motor paramétrico) e
// módulos-caixa (box-builder V3) numa única saída consolidada, para que o
// pipeline de custo/BOM/proposta trate tudo de forma uniforme.

export interface CalcMistoInput {
  ambiente: { tipo: string; materiais: MateriaisAmbiente };
  parametros: ParametrosFabrica;
  templateModulos: ModuloInstanciado[];
  boxes: BoxModule[];
  templates?: Record<string, ModuloTemplate>; // overrides de engenharia (V2-4)
}

export function calcularOrcamentoMisto(input: CalcMistoInput): EngineOutput {
  let porModulo: ResultadoModulo[] = [];
  let globais: EngineOutput["globais"] = [];
  let warnings: EngineOutput["warnings"] = [];

  if (input.templateModulos.length > 0) {
    const out = calcularEngine({
      ambiente: input.ambiente,
      parametros: input.parametros,
      modulos: input.templateModulos,
      templates: input.templates,
    });
    porModulo = [...out.porModulo];
    globais = out.globais;
    warnings = out.warnings;
  }

  for (const box of input.boxes) {
    const r = explodeBox(box);
    porModulo.push({
      moduloId: box.id,
      templateCodigo: box.tipo.toUpperCase(),
      nome: box.nome,
      pecas: r.pecas,
      ferragens: r.ferragens,
      areaMdfM2: r.areaMdfM2,
      fitaM: r.fitaM,
    });
  }

  const consolidado = consolidarResultados(
    porModulo,
    globais,
    input.parametros.perda_mdf
  );
  return { porModulo, globais, consolidado, warnings };
}
