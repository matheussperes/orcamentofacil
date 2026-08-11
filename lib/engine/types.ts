// Tipos do motor paramétrico de engenharia (doc 04).
// O motor é uma função pura: (entrada) => saída determinística.

export type MaterialTipo = "caixa" | "frente" | "fundo" | "prateleira";
export type Categoria = "inferior" | "superior" | "torre" | "complemento";

// Veio de chapa (Modelo de Domínio, Seção 8 — Task 12.5). Qual dimensão da
// peça se alinha ao COMPRIMENTO da chapa (o eixo maior — `CHAPA_LARGURA_MM`
// em lib/engine/box/cutting.ts, apesar do nome da constante; ver nota de
// nomenclatura lá): "comprimento" = a peça mantém a orientação "natural" que
// `largura_mm`/`altura_mm` já tinham antes desta task (largura_mm no eixo do
// comprimento da chapa); "largura" = orientação invertida (altura_mm no eixo
// do comprimento da chapa). Só importa quando `Peca.temVeio` é `true` — com
// `false`, o bin-packing ignora o campo e gira livremente.
export type SentidoVeio = "comprimento" | "largura";

export interface FitaBorda {
  lados_altura: number;
  lados_largura: number;
}

export interface Componente {
  nome: string;
  quantidade: string; // número ou fórmula
  material_tipo: MaterialTipo;
  dimensoes: { altura: string; largura: string };
  fita_borda: FitaBorda;
}

export interface Ferragem {
  item: string;
  quantidade: string; // número ou fórmula
}

export interface Limite {
  min: number;
  max: number;
}

export interface ModuloTemplate {
  codigo: string;
  versao: number;
  nome: string;
  categoria: Categoria;
  limites: {
    largura: Limite;
    altura: Limite;
    profundidade: Limite;
  };
  config_padrao: Record<string, number>;
  componentes: Componente[];
  ferragens: Ferragem[];
  participa_elementos_continuos: { tampo: boolean; rodape: boolean };
}

// Parâmetros de fábrica resolvidos (camada 2). Chaves sem o prefixo PARAM_.
export interface ParametrosFabrica {
  ESPESSURA_CAIXA: number;
  ESPESSURA_FRENTE: number;
  ESPESSURA_FUNDO: number;
  FOLGA_PORTA: number;
  FOLGA_SUPERIOR: number;
  FOLGA_INFERIOR: number;
  RECUO_PRATELEIRA: number;
  DESCONTO_CORREDICA: number;
  VAO_CORREDICA: number;
  LARGURA_PORTA_CANTO: number;
  ALTURA_NICHOS_ELETRO: number;
  PROFUNDIDADE_RASGO: number;
  ALTURA_RODAPE: number; // altura da peça de rodapé (mm)
  RECUO_RODAPE: number; // recuo lateral do rodapé por ponta (mm)
  perda_mdf: number; // fração, ex.: 0.12
  [k: string]: number;
}

export interface MateriaisAmbiente {
  cor_caixa: string;
  cor_frente: string;
  cor_fundo: string;
}

// V2-1: configuração de cor/espessura por módulo, por parte construtiva.
// Cada componente do template é mapeado a um "slot": externo (caixa aparente),
// interno (prateleiras/fundo) ou portas (frentes).
export interface MDFSlot {
  espessura: number; // 6 | 15 | 18
  acabamento: string; // "Branco TX", "Louro Freijó"…
}
export interface ConfiguracaoMaterialModulo {
  interno: MDFSlot;
  externo: MDFSlot;
  portas: MDFSlot;
  temFundo: boolean;
}

export interface ModuloInstanciado {
  id: string;
  templateCodigo: string;
  parede?: string;
  largura_mm: number;
  altura_mm: number;
  profundidade_mm: number;
  config?: Record<string, number>;
  overridesMaterial?: Partial<MateriaisAmbiente>;
  configMaterial?: ConfiguracaoMaterialModulo; // V2-1 (sobrescreve a herança)
}

export interface EngineInput {
  ambiente: {
    tipo: string;
    materiais: MateriaisAmbiente;
  };
  modulos: ModuloInstanciado[];
  parametros: ParametrosFabrica;
  // V2-4: templates customizados por requisição (overrides do configurador de
  // engenharia). Se ausente, usa a Biblioteca de Engenharia padrão.
  templates?: Record<string, ModuloTemplate>;
}

// ---- Saída ----

export interface Peca {
  nome: string;
  quantidade: number;
  material_tipo: MaterialTipo;
  cor: string;
  espessura_mm: number;
  altura_mm: number;
  largura_mm: number;
  area_m2: number; // já multiplicada pela quantidade
  fita_m: number; // metros de fita da peça (já × quantidade)
  // Veio de chapa (Seção 8, Task 12.5). Denormalizado do `BoxMaterial` de
  // origem (mesmo padrão de `cor`/`espessura_mm`, que já são cópias e não
  // referência) — evita lookup externo em `lib/engine/box/cutting.ts`, que só
  // enxerga `Peca`, não o `BoxModule`/`BoxMaterial` de onde ela veio.
  // Obrigatório (não opcional): módulos que ainda não têm UI de veio (Placa,
  // Elemento Contínuo — Fase C/Stage 13) setam `temVeio: false` e
  // `sentidoVeio: "comprimento"` como placeholder (o valor de `sentidoVeio` é
  // ignorado pelo bin-packing quando `temVeio` é `false`).
  temVeio: boolean;
  sentidoVeio: SentidoVeio;
}

export interface ItemQtd {
  item: string;
  quantidade: number;
}

export interface ResultadoModulo {
  moduloId: string;
  templateCodigo: string;
  nome: string;
  pecas: Peca[];
  ferragens: ItemQtd[];
  areaMdfM2: number;
  fitaM: number;
}

export interface GrupoMdf {
  cor: string;
  espessura_mm: number;
  area_m2: number;
  area_com_perda_m2: number;
  chapas: number;
}

// Fita de borda agregada por cor (Task 3.5) — cada cor de fita é um produto
// distinto no catálogo, por isso a saída discrimina também por
// `larguraFitaMm` quando a mesma cor cruza mais de uma largura (mesma
// espessura final -> larguras diferentes de fita não se somam no mesmo SKU).
export interface GrupoFita {
  cor: string;
  larguraFitaMm: number;
  metros: number;
}

// Elemento contínuo agregado por parede (etapa global — doc 04): tampo/rodapé
// que atravessam vários módulos formando uma única peça.
export interface PecaLinear {
  tipo: "tampo" | "rodape";
  parede: string;
  comprimento_mm: number;
  largura_mm: number; // profundidade (tampo) ou altura (rodapé)
  cor: string;
  espessura_mm: number;
  area_m2: number;
  fita_m: number;
  modulos: number; // quantos módulos o elemento cobre
}

export interface EngineWarning {
  moduloId?: string;
  severidade: "erro" | "aviso";
  codigo: string;
  mensagem: string;
}

export interface EngineOutput {
  porModulo: ResultadoModulo[];
  globais: PecaLinear[];
  consolidado: {
    mdf: GrupoMdf[];
    fitaTotalM: number;
    fitaPorCor: GrupoFita[];
    ferragens: ItemQtd[];
  };
  warnings: EngineWarning[];
}
