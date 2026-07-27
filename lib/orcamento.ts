import { consolidarResultados } from "./engine/consolidar";
import { explodeBox } from "./engine/box";
import { larguraInstalacaoBox, type BoxModule } from "./engine/box/types";
import { explodePlaca } from "./engine/placa";
import type { Placa } from "./engine/placa/types";
import type {
  EngineOutput,
  MateriaisAmbiente,
  ParametrosFabrica,
  ResultadoModulo,
} from "./engine/types";

// Modelo unificado de item de orçamento: uma única lista polimórfica de
// módulos-caixa (box-builder V3) + placas avulsas (Task 12.1), em vez de
// estado paralelo na UI ("efeito Frankenstein"). Union discriminada por
// `origem` — o motor de templates V1 foi removido na Task 10.1; a Task 12.1
// adiciona o branch `{ origem: "placa"; placa: Placa }` (Modelo de Domínio,
// Seção 1). Mantém a forma de objeto discriminado de propósito — NÃO
// colapsar num tipo solto.
export type ModuloOrcamento =
  | { origem: "custom_box"; box: BoxModule }
  | { origem: "placa"; placa: Placa };

export function idDoItem(m: ModuloOrcamento): string {
  return m.origem === "custom_box" ? m.box.id : m.placa.id;
}
export function paredeDoItem(m: ModuloOrcamento): string {
  return (m.origem === "custom_box" ? m.box.parede : m.placa.parede) ?? "A";
}
// Largura de INSTALAÇÃO (doc 12: tamponamento soma à largura, decisão A) —
// usada na barra/canvas de ocupação da parede. Não é a largura de fabricação
// da carcaça (essa fica em `box.largura`, intacta para o cálculo de peças).
// Placa não tem tamponamento de instância — largura de instalação = largura
// de face.
export function larguraDoItem(m: ModuloOrcamento): number {
  return m.origem === "custom_box" ? larguraInstalacaoBox(m.box) : m.placa.largura;
}
export function alturaDoItem(m: ModuloOrcamento): number {
  return m.origem === "custom_box" ? m.box.altura : m.placa.altura;
}
// Placa não tem profundidade própria (é uma peça plana): usa a espessura
// BASE do material como "profundidade" de ocupação — é o quanto a peça
// projeta da parede/vão quando instalada, análogo à profundidade de um box.
export function profundidadeDoItem(m: ModuloOrcamento): number {
  return m.origem === "custom_box" ? m.box.profundidade : m.placa.material.espessura;
}
export function corExternaDoItem(m: ModuloOrcamento): string | undefined {
  return m.origem === "custom_box" ? m.box.caixa.cor : m.placa.material.cor;
}

export interface CalcMistoInput {
  ambiente: { tipo: string; materiais: MateriaisAmbiente };
  parametros: ParametrosFabrica;
  itens: ModuloOrcamento[];
}

export function calcularOrcamentoMisto(input: CalcMistoInput): EngineOutput {
  const porModulo: ResultadoModulo[] = [];
  const globais: EngineOutput["globais"] = [];
  const warnings: EngineOutput["warnings"] = [];

  for (const item of input.itens) {
    if (item.origem === "custom_box") {
      const box = item.box;
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
    } else {
      const placa = item.placa;
      const r = explodePlaca(placa);
      porModulo.push({
        moduloId: placa.id,
        templateCodigo: "PLACA",
        nome: placa.nome,
        pecas: r.pecas,
        ferragens: r.ferragens,
        areaMdfM2: r.areaMdfM2,
        fitaM: r.fitaM,
      });
    }
  }

  const consolidado = consolidarResultados(
    porModulo,
    globais,
    input.parametros.perda_mdf
  );
  return { porModulo, globais, consolidado, warnings };
}
