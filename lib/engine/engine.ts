import { evalFormula } from "./evaluator";
import { getTemplate } from "./templates";
import type {
  EngineInput,
  EngineOutput,
  EngineWarning,
  GrupoMdf,
  ItemQtd,
  MaterialTipo,
  MateriaisAmbiente,
  ModuloInstanciado,
  ModuloTemplate,
  ParametrosFabrica,
  Peca,
  PecaLinear,
  ResultadoModulo,
} from "./types";

const AREA_CHAPA_M2 = 2.75 * 1.84; // 5.06 m² (chapa comercial padrão)

/** Resolve o template: overrides da requisição (V2-4) → Biblioteca padrão. */
function resolveTemplate(codigo: string, input: EngineInput): ModuloTemplate {
  return input.templates?.[codigo] ?? getTemplate(codigo);
}

/** V2-1: mapeia o tipo de peça a um slot de material (interno/externo/portas). */
function slotDe(tipo: MaterialTipo): "interno" | "externo" | "portas" {
  if (tipo === "frente") return "portas";
  if (tipo === "caixa") return "externo";
  return "interno"; // prateleira, fundo
}

/**
 * Monta o escopo de variáveis (MEDIDA_*, CONFIG_*, PARAM_*) para avaliar as
 * fórmulas de um módulo (doc 04, etapa 1 — resolução de contexto).
 */
function montarEscopo(
  template: ModuloTemplate,
  modulo: ModuloInstanciado,
  parametros: ParametrosFabrica
): Record<string, number> {
  const scope: Record<string, number> = {
    MEDIDA_LARGURA: modulo.largura_mm,
    MEDIDA_ALTURA: modulo.altura_mm,
    MEDIDA_PROFUNDIDADE: modulo.profundidade_mm,
  };

  // CONFIG_* — defaults do template sobrescritos pela instância.
  const config = { ...template.config_padrao, ...(modulo.config ?? {}) };
  for (const [chave, valor] of Object.entries(config)) {
    scope[chave] = valor;
  }

  // PARAM_* — parâmetros de fábrica (exceto perda_mdf, que não é dimensional).
  for (const [chave, valor] of Object.entries(parametros)) {
    if (chave === "perda_mdf") continue;
    scope[`PARAM_${chave}`] = valor as number;
  }

  return scope;
}

/** Espessura da peça conforme o tipo de material (herança fábrica). */
function espessuraDe(tipo: MaterialTipo, p: ParametrosFabrica): number {
  switch (tipo) {
    case "frente":
      return p.ESPESSURA_FRENTE;
    case "fundo":
      return p.ESPESSURA_FUNDO;
    case "caixa":
    case "prateleira":
    default:
      return p.ESPESSURA_CAIXA;
  }
}

/** Cor da peça, com herança ambiente → override do módulo (doc 03). */
function corDe(
  tipo: MaterialTipo,
  materiais: MateriaisAmbiente,
  overrides?: Partial<MateriaisAmbiente>
): string {
  const m = { ...materiais, ...(overrides ?? {}) };
  switch (tipo) {
    case "frente":
      return m.cor_frente;
    case "fundo":
      return m.cor_fundo;
    case "caixa":
    case "prateleira":
    default:
      return m.cor_caixa;
  }
}

/**
 * Resolve cor + espessura de uma peça. Se o módulo tem `configMaterial` (V2-1),
 * usa o slot correspondente; senão, cai na herança de ambiente + parâmetros de
 * fábrica (comportamento legado). O fundo mantém a espessura de fábrica
 * (tipicamente 6mm), variando apenas a cor.
 */
function resolverMaterial(
  tipo: MaterialTipo,
  modulo: ModuloInstanciado,
  input: EngineInput
): { cor: string; espessura: number } {
  const cm = modulo.configMaterial;
  if (cm) {
    const slot = cm[slotDe(tipo)];
    const espessura =
      tipo === "fundo" ? input.parametros.ESPESSURA_FUNDO : slot.espessura;
    return { cor: slot.acabamento, espessura };
  }
  return {
    cor: corDe(tipo, input.ambiente.materiais, modulo.overridesMaterial),
    espessura: espessuraDe(tipo, input.parametros),
  };
}

/** Etapa 2 — validação física contra os limites do template. */
function validarLimites(
  template: ModuloTemplate,
  modulo: ModuloInstanciado
): EngineWarning[] {
  const avisos: EngineWarning[] = [];
  const checa = (
    dim: "largura" | "altura" | "profundidade",
    valor: number
  ) => {
    const { min, max } = template.limites[dim];
    if (valor < min || valor > max) {
      avisos.push({
        moduloId: modulo.id,
        severidade: "erro",
        codigo: `LIMITE_${dim.toUpperCase()}`,
        mensagem: `${template.nome}: ${dim} ${valor}mm fora do intervalo permitido (${min}–${max}mm).`,
      });
    }
  };
  checa("largura", modulo.largura_mm);
  checa("altura", modulo.altura_mm);
  checa("profundidade", modulo.profundidade_mm);
  return avisos;
}

/** Etapa 3 — explosão de peças e ferragens de um módulo. */
function explodirModulo(
  modulo: ModuloInstanciado,
  input: EngineInput
): { resultado: ResultadoModulo; warnings: EngineWarning[] } {
  const template = resolveTemplate(modulo.templateCodigo, input);
  const scope = montarEscopo(template, modulo, input.parametros);
  const warnings = validarLimites(template, modulo);

  const pecas: Peca[] = [];
  let areaMdfM2 = 0;
  let fitaM = 0;

  const semFundo =
    modulo.configMaterial != null && modulo.configMaterial.temFundo === false;

  for (const comp of template.componentes) {
    // V2-1: toggle "tem fundo" remove as peças de fundo.
    if (semFundo && comp.material_tipo === "fundo") continue;

    const quantidade = Math.round(evalFormula(comp.quantidade, scope));
    if (quantidade <= 0) continue;

    const altura = evalFormula(comp.dimensoes.altura, scope);
    const largura = evalFormula(comp.dimensoes.largura, scope);

    if (altura <= 0 || largura <= 0) {
      warnings.push({
        moduloId: modulo.id,
        severidade: "aviso",
        codigo: "DIMENSAO_INVALIDA",
        mensagem: `${template.nome} / ${comp.nome}: dimensão não positiva (${largura}×${altura}mm) — peça ignorada.`,
      });
      continue;
    }

    const areaPeca = (altura * largura) / 1e6; // mm² → m²
    const areaTotal = areaPeca * quantidade;

    // Fita de borda: perímetro parcial conforme os lados fitados.
    const fitaPorPeca =
      (comp.fita_borda.lados_altura * altura +
        comp.fita_borda.lados_largura * largura) /
      1000; // mm → m
    const fitaTotal = fitaPorPeca * quantidade;

    areaMdfM2 += areaTotal;
    fitaM += fitaTotal;

    const material = resolverMaterial(comp.material_tipo, modulo, input);
    pecas.push({
      nome: comp.nome,
      quantidade,
      material_tipo: comp.material_tipo,
      cor: material.cor,
      espessura_mm: material.espessura,
      altura_mm: Math.round(altura),
      largura_mm: Math.round(largura),
      area_m2: round4(areaTotal),
      fita_m: round4(fitaTotal),
    });
  }

  const ferragens: ItemQtd[] = [];
  for (const f of template.ferragens) {
    const q = Math.round(evalFormula(f.quantidade, scope));
    if (q > 0) ferragens.push({ item: f.item, quantidade: q });
  }

  return {
    resultado: {
      moduloId: modulo.id,
      templateCodigo: template.codigo,
      nome: template.nome,
      pecas,
      ferragens,
      areaMdfM2: round4(areaMdfM2),
      fitaM: round4(fitaM),
    },
    warnings,
  };
}

/**
 * Etapa 4 — elementos contínuos (doc 04). Agrega, por parede, os módulos que
 * participam de tampo/rodapé e gera UMA peça linear por parede em vez de peças
 * picadas por módulo (marceneiro quer um tampo/rodapé único).
 */
function calcularElementosContinuos(input: EngineInput): PecaLinear[] {
  interface Acc {
    parede: string;
    comprimento: number;
    profundidadeMax: number;
    modulos: number;
    // Material do 1º módulo participante com config próprio (V2-1), se houver.
    corExterno?: string;
    espExterno?: number;
  }
  const tampoPorParede = new Map<string, Acc>();
  const rodapePorParede = new Map<string, Acc>();

  const acumular = (
    mapa: Map<string, Acc>,
    parede: string,
    modulo: ModuloInstanciado
  ) => {
    const a =
      mapa.get(parede) ??
      { parede, comprimento: 0, profundidadeMax: 0, modulos: 0 };
    // Captura o material externo do primeiro módulo que traz config próprio.
    if (a.corExterno == null && modulo.configMaterial) {
      a.corExterno = modulo.configMaterial.externo.acabamento;
      a.espExterno = modulo.configMaterial.externo.espessura;
    }
    a.comprimento += modulo.largura_mm;
    a.profundidadeMax = Math.max(a.profundidadeMax, modulo.profundidade_mm);
    a.modulos += 1;
    mapa.set(parede, a);
  };

  for (const modulo of input.modulos) {
    const template = resolveTemplate(modulo.templateCodigo, input);
    const parede = modulo.parede ?? "—";
    if (template.participa_elementos_continuos.tampo) {
      acumular(tampoPorParede, parede, modulo);
    }
    if (template.participa_elementos_continuos.rodape) {
      acumular(rodapePorParede, parede, modulo);
    }
  }

  const p = input.parametros;
  const m = input.ambiente.materiais;
  const pecas: PecaLinear[] = [];

  for (const a of tampoPorParede.values()) {
    const comprimento = a.comprimento;
    const largura = a.profundidadeMax;
    pecas.push({
      tipo: "tampo",
      parede: a.parede,
      comprimento_mm: comprimento,
      largura_mm: largura,
      cor: a.corExterno ?? m.cor_frente,
      espessura_mm: a.espExterno ?? p.ESPESSURA_FRENTE,
      area_m2: round4((comprimento * largura) / 1e6),
      fita_m: round4(comprimento / 1000), // borda frontal aparente
      modulos: a.modulos,
    });
  }

  for (const a of rodapePorParede.values()) {
    const comprimento = Math.max(0, a.comprimento - 2 * p.RECUO_RODAPE);
    const altura = p.ALTURA_RODAPE;
    pecas.push({
      tipo: "rodape",
      parede: a.parede,
      comprimento_mm: comprimento,
      largura_mm: altura,
      cor: a.corExterno ?? m.cor_caixa,
      espessura_mm: a.espExterno ?? p.ESPESSURA_CAIXA,
      area_m2: round4((comprimento * altura) / 1e6),
      fita_m: round4(comprimento / 1000),
      modulos: a.modulos,
    });
  }

  return pecas;
}

interface EntradaMdf {
  cor: string;
  espessura_mm: number;
  area_m2: number;
}

/** Etapa 5 — consolidação de MDF (por cor×espessura), fita e ferragens. */
function consolidar(
  modulos: ResultadoModulo[],
  globais: PecaLinear[],
  perdaMdf: number
): EngineOutput["consolidado"] {
  const mdfMap = new Map<string, GrupoMdf>();
  const ferragensMap = new Map<string, number>();
  let fitaTotalM = 0;

  const somaMdf = ({ cor, espessura_mm, area_m2 }: EntradaMdf) => {
    const chave = `${cor}|${espessura_mm}`;
    const g =
      mdfMap.get(chave) ??
      { cor, espessura_mm, area_m2: 0, area_com_perda_m2: 0, chapas: 0 };
    g.area_m2 += area_m2;
    mdfMap.set(chave, g);
  };

  for (const mod of modulos) {
    fitaTotalM += mod.fitaM;
    for (const peca of mod.pecas) somaMdf(peca);
    for (const f of mod.ferragens) {
      ferragensMap.set(f.item, (ferragensMap.get(f.item) ?? 0) + f.quantidade);
    }
  }

  for (const g of globais) {
    fitaTotalM += g.fita_m;
    somaMdf(g);
  }

  const mdf: GrupoMdf[] = [];
  for (const g of mdfMap.values()) {
    g.area_m2 = round4(g.area_m2);
    g.area_com_perda_m2 = round4(g.area_m2 * (1 + perdaMdf));
    g.chapas = Math.ceil(g.area_com_perda_m2 / AREA_CHAPA_M2);
    mdf.push(g);
  }
  mdf.sort((a, b) =>
    a.cor === b.cor ? a.espessura_mm - b.espessura_mm : a.cor.localeCompare(b.cor)
  );

  const ferragens: ItemQtd[] = [...ferragensMap.entries()]
    .map(([item, quantidade]) => ({ item, quantidade }))
    .sort((a, b) => a.item.localeCompare(b.item));

  return { mdf, fitaTotalM: round4(fitaTotalM), ferragens };
}

/**
 * Ponto de entrada do motor. Função pura e determinística: mesma entrada
 * produz sempre a mesma saída (base dos testes golden — doc 09).
 */
export function calcularEngine(input: EngineInput): EngineOutput {
  const porModulo: ResultadoModulo[] = [];
  const warnings: EngineWarning[] = [];

  for (const modulo of input.modulos) {
    const { resultado, warnings: w } = explodirModulo(modulo, input);
    porModulo.push(resultado);
    warnings.push(...w);
  }

  const globais = calcularElementosContinuos(input);
  const consolidado = consolidar(porModulo, globais, input.parametros.perda_mdf);
  return { porModulo, globais, consolidado, warnings };
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
