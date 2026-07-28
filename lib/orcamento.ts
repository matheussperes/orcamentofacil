import { consolidarResultados } from "./engine/consolidar";
import { explodeBox } from "./engine/box";
import { larguraInstalacaoBox, type BoxModule } from "./engine/box/types";
import { explodePlaca } from "./engine/placa";
import type { Placa } from "./engine/placa/types";
import { explodeElementoContinuo } from "./engine/elemento-continuo";
import type { AlvoResolvido, ElementoContinuo } from "./engine/elemento-continuo/types";
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

// Schema de capacidades (Modelo de Domínio, Seção 4 — Task 13.1). Cada tipo
// de item declara quais seções de configuração se aplicam a ele. O Editor de
// Item (`app/modulo/`) LÊ este schema para decidir quais seções renderizar —
// é a única fonte de verdade de "o que aparece"; não deve haver
// `if (origem === "placa")` espalhado escondendo seção por seção no
// componente. Ver `app/modulo/secoes.ts` para a derivação da lista de
// seções da UI de Placa a partir deste schema.
export type Capacidade =
  | "dimensoes"
  | "material"
  | "vaos"
  | "portas"
  | "gavetas"
  | "puxador"
  | "prateleiras"
  | "engrossamento"
  | "ripado"
  | "orientacao"
  | "bordaPorLado";

export const CAPACIDADES: Record<ModuloOrcamento["origem"], Capacidade[]> = {
  custom_box: ["dimensoes", "material", "vaos", "portas", "gavetas", "puxador", "prateleiras"],
  placa: ["dimensoes", "material", "orientacao", "bordaPorLado", "engrossamento", "ripado"],
};

// Elemento Contínuo (Task 12.4, lib/engine/elemento-continuo/) + o alvo já
// resolvido pelo chamador (`AlvoResolvido` — soma/máximo de itens do bloco ou
// módulo da extremidade). `calcularOrcamentoMisto` não sabe resolver
// `{conjuntoId}`/`{moduloId}` em dimensões (isso é I/O de domínio: olhar
// Conjunto/Parede/os itens do orçamento — Task 13.2, quando a Fase C tiver
// esses dados reais); aqui só entram os números já prontos, mesma fronteira
// documentada em `lib/engine/elemento-continuo/types.ts` (`AlvoResolvido`).
export interface ElementoContinuoResolvido {
  elemento: ElementoContinuo;
  alvo: AlvoResolvido;
}

export interface CalcMistoInput {
  ambiente: { tipo: string; materiais: MateriaisAmbiente };
  parametros: ParametrosFabrica;
  itens: ModuloOrcamento[];
  // Opcional/retrocompatível — chamadas existentes sem este campo continuam
  // funcionando exatamente como antes (Task 12.7).
  elementosContinuos?: ElementoContinuoResolvido[];
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

  // Task 12.7: cada Elemento Contínuo explodido vira um `ResultadoModulo`
  // SINTÉTICO empurrado em `porModulo` — mesmo padrão que `BoxModule`/`Placa`
  // já usam acima (moduloId/templateCodigo/nome/pecas/ferragens/areaMdfM2/
  // fitaM). Decisão do Maestro: NÃO tocar `globais`/`PecaLinear` (formato
  // antigo, V1, que `lib/insumos.ts::todasAsPecas` já lê com shape próprio) —
  // fica como está, sempre `[]`. Erros de `validarPosicao` (dentro de
  // `explodeElementoContinuo`) propagam sem serem capturados, mesmo padrão de
  // `explodeBox`/`explodePlaca` acima.
  for (const ec of input.elementosContinuos ?? []) {
    const r = explodeElementoContinuo(ec.elemento, ec.alvo);
    porModulo.push({
      moduloId: ec.elemento.id,
      templateCodigo: ec.elemento.tipo.toUpperCase(),
      nome: nomeElementoContinuo(ec.elemento.tipo),
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

// Nome legível do `ResultadoModulo` sintético (Task 12.7) — capitalize do
// `tipo` do Elemento Contínuo. As peças internas já têm nomes próprios mais
// específicos ("Rodapé", "Fechamento", "Tamponamento (inteiro)" — ver
// `lib/engine/elemento-continuo/explode.ts`); este é só o rótulo do
// "módulo"/linha agregada, mesmo nível de `box.nome`/`placa.nome`.
function nomeElementoContinuo(tipo: ElementoContinuo["tipo"]): string {
  const nomes: Record<ElementoContinuo["tipo"], string> = {
    tampo: "Tampo",
    rodape: "Rodapé",
    tamponamento: "Tamponamento",
    fechamento: "Fechamento",
  };
  return nomes[tipo];
}
