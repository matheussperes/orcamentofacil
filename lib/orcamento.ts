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

// Modelo unificado de item de orçamento: uma única lista polimórfica para
// módulos de template (motor paramétrico) e módulos-caixa (box-builder V3),
// em vez de duas listas de estado paralelas na UI ("efeito Frankenstein").
// Union discriminada por `origem`, aninhando os tipos de domínio já existentes
// — dá segurança de tipo ao estreitar, sem sopa de campos opcionais.
export type ModuloOrcamento =
  | { origem: "template"; modulo: ModuloInstanciado }
  | { origem: "custom_box"; box: BoxModule };

export function idDoItem(m: ModuloOrcamento): string {
  return m.origem === "template" ? m.modulo.id : m.box.id;
}
export function paredeDoItem(m: ModuloOrcamento): string {
  return (m.origem === "template" ? m.modulo.parede : m.box.parede) ?? "A";
}
export function larguraDoItem(m: ModuloOrcamento): number {
  return m.origem === "template" ? m.modulo.largura_mm : m.box.largura;
}
export function alturaDoItem(m: ModuloOrcamento): number {
  return m.origem === "template" ? m.modulo.altura_mm : m.box.altura;
}
export function profundidadeDoItem(m: ModuloOrcamento): number {
  return m.origem === "template" ? m.modulo.profundidade_mm : m.box.profundidade;
}
export function corExternaDoItem(m: ModuloOrcamento): string | undefined {
  return m.origem === "template"
    ? m.modulo.configMaterial?.externo.acabamento ?? m.modulo.overridesMaterial?.cor_caixa
    : m.box.caixa.cor;
}

export interface CalcMistoInput {
  ambiente: { tipo: string; materiais: MateriaisAmbiente };
  parametros: ParametrosFabrica;
  itens: ModuloOrcamento[];
  templates?: Record<string, ModuloTemplate>; // overrides de engenharia (V2-4)
}

export function calcularOrcamentoMisto(input: CalcMistoInput): EngineOutput {
  const templateModulos = input.itens
    .filter(
      (i): i is Extract<ModuloOrcamento, { origem: "template" }> =>
        i.origem === "template"
    )
    .map((i) => i.modulo);
  const boxes = input.itens
    .filter(
      (i): i is Extract<ModuloOrcamento, { origem: "custom_box" }> =>
        i.origem === "custom_box"
    )
    .map((i) => i.box);

  let porModulo: ResultadoModulo[] = [];
  let globais: EngineOutput["globais"] = [];
  let warnings: EngineOutput["warnings"] = [];

  if (templateModulos.length > 0) {
    const out = calcularEngine({
      ambiente: input.ambiente,
      parametros: input.parametros,
      modulos: templateModulos,
      templates: input.templates,
    });
    porModulo = [...out.porModulo];
    globais = out.globais;
    warnings = out.warnings;
  }

  for (const box of boxes) {
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
