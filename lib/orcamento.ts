import { consolidarResultados } from "./engine/consolidar";
import { explodeBox } from "./engine/box";
import { larguraInstalacaoBox, type BoxModule } from "./engine/box/types";
import type {
  EngineOutput,
  MateriaisAmbiente,
  ParametrosFabrica,
  ResultadoModulo,
} from "./engine/types";

// Modelo unificado de item de orçamento: uma única lista polimórfica de
// módulos-caixa (box-builder V3), em vez de estado paralelo na UI ("efeito
// Frankenstein"). Union discriminada por `origem` — hoje com um único
// membro real (o motor de templates V1 foi removido na Task 10.1); a Task
// 12.1 adiciona o branch `{ origem: "placa"; placa: Placa }` (Modelo de
// Domínio, Seção 1). Mantém a forma de objeto discriminado de propósito —
// não colapsar em `BoxModule` solto quando o segundo branch chegar.
export type ModuloOrcamento = { origem: "custom_box"; box: BoxModule };

export function idDoItem(m: ModuloOrcamento): string {
  return m.box.id;
}
export function paredeDoItem(m: ModuloOrcamento): string {
  return m.box.parede ?? "A";
}
// Largura de INSTALAÇÃO (doc 12: tamponamento soma à largura, decisão A) —
// usada na barra/canvas de ocupação da parede. Não é a largura de fabricação
// da carcaça (essa fica em `box.largura`, intacta para o cálculo de peças).
export function larguraDoItem(m: ModuloOrcamento): number {
  return larguraInstalacaoBox(m.box);
}
export function alturaDoItem(m: ModuloOrcamento): number {
  return m.box.altura;
}
export function profundidadeDoItem(m: ModuloOrcamento): number {
  return m.box.profundidade;
}
export function corExternaDoItem(m: ModuloOrcamento): string | undefined {
  return m.box.caixa.cor;
}

export interface CalcMistoInput {
  ambiente: { tipo: string; materiais: MateriaisAmbiente };
  parametros: ParametrosFabrica;
  itens: ModuloOrcamento[];
}

export function calcularOrcamentoMisto(input: CalcMistoInput): EngineOutput {
  const boxes = input.itens.map((i) => i.box);

  const porModulo: ResultadoModulo[] = [];
  const globais: EngineOutput["globais"] = [];
  const warnings: EngineOutput["warnings"] = [];

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
