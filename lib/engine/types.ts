// Tipos do motor paramétrico de engenharia (doc 04).
// O motor é uma função pura: (entrada) => saída determinística.

export type MaterialTipo = "caixa" | "frente" | "fundo" | "prateleira";
export type Categoria = "inferior" | "superior" | "torre" | "complemento";

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

export interface ModuloInstanciado {
  id: string;
  templateCodigo: string;
  parede?: string;
  largura_mm: number;
  altura_mm: number;
  profundidade_mm: number;
  config?: Record<string, number>;
  overridesMaterial?: Partial<MateriaisAmbiente>;
}

export interface EngineInput {
  ambiente: {
    tipo: string;
    materiais: MateriaisAmbiente;
  };
  modulos: ModuloInstanciado[];
  parametros: ParametrosFabrica;
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
    ferragens: ItemQtd[];
  };
  warnings: EngineWarning[];
}
