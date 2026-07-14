// V3 — Motor de caixa vazia + subdivisões (arquitetura CAD paramétrica).
// Cada módulo é uma caixa que o usuário subdivide recursivamente em vãos, e em
// cada vão-folha coloca conteúdo (portas, gavetas, prateleiras, etc.).

export type CarcassType = "aereo" | "inferior" | "torre";

export interface BoxMaterial {
  cor: string;
  espessura: number; // mm
}

export type SentidoPorta = "esquerda" | "direita" | "basculante" | "cava";
export type LadoTamponamento = "direito" | "esquerdo" | "superior" | "inferior";

// A "frente" de um vão-folha: o que cobre a abertura visível (ou nada).
// Independente de prateleiras/fundo — um vão com portas PODE ter prateleiras
// internas ao mesmo tempo (não precisa dividir o vão para isso).
export type FrenteConteudo =
  | { tipo: "vazio" }
  | {
      tipo: "portas";
      qtd: number;
      sentidos: SentidoPorta[]; // um por porta
      material: BoxMaterial;
    }
  | {
      tipo: "gaveta";
      qtd: number;
      profundidade: number; // mm
      interna: boolean; // true = guarda-roupa (frente cor da caixa)
      corFrente?: string; // usado quando externa
      espessuraFrente?: number; // usado quando externa (default 18)
    };

// Conteúdo de um vão-folha: OU um espaço normal (frente + atributos internos
// combináveis), OU o vão inteiro vira um painel de tamponamento estrutural
// (parte do gabarito — diferente do TamponamentoInstancia, que é comercial).
export type BayContent =
  | {
      tipo: "espaco";
      frente: FrenteConteudo;
      prateleiras?: { qtd: number; recuo: number }; // recuo frontal (mm)
      fundo?: { espessura: number };
    }
  | {
      tipo: "tamponamento";
      lado: LadoTamponamento;
      material: BoxMaterial;
      sarrafo: boolean; // true = quadro de sarrafos; false = chapa inteiriça
    };

export interface BayNode {
  id: string;
  split: "vertical" | "horizontal" | "none";
  qtdDivisorias: number; // nº de divisórias (gera qtdDivisorias+1 vãos)
  children?: BayNode[]; // sub-vãos quando dividido
  content?: BayContent; // conteúdo quando split === "none"
}

// Tamponamento de INSTÂNCIA (comercial/instalação) — diferente do
// `BayContent` "tamponamento" (que é estrutural, parte do gabarito). Decidido:
// o painel é colado POR FORA da carcaça já pronta, somando à largura de
// instalação do módulo (não altera as peças internas da carcaça). Cada lado
// tem sua própria montagem (inteiriça/sarrafo) e material.
export interface TamponamentoLado {
  ativo: boolean;
  sarrafo: boolean;
  material: BoxMaterial;
}
export interface TamponamentoInstancia {
  esquerdo: TamponamentoLado;
  direito: TamponamentoLado;
  superior: TamponamentoLado;
  inferior: TamponamentoLado;
}

export interface BoxModule {
  id: string;
  nome: string;
  tipo: CarcassType;
  parede?: string;
  categoria?: string; // ambiente de origem do preset (informativo, herdado ao instanciar)
  largura: number; // mm
  altura: number; // mm
  profundidade: number; // mm
  caixa: BoxMaterial; // cor + espessura da caixa interna (laterais, base, tampo…)
  raiz: BayNode;
  tamponamento?: TamponamentoInstancia; // override de instância (doc 12, Etapa 3)
  overridePortas?: BoxMaterial; // override de instância: cor/espessura de TODAS as portas
  overrideTemFundo?: boolean; // override de instância: liga/desliga fundo em todos os vãos
}

/** Espessura lateral extra somada à largura de instalação (doc 12: decisão A). */
export function larguraInstalacaoBox(box: BoxModule): number {
  const t = box.tamponamento;
  if (!t) return box.largura;
  const esq = t.esquerdo.ativo ? t.esquerdo.material.espessura : 0;
  const dir = t.direito.ativo ? t.direito.material.espessura : 0;
  return box.largura + esq + dir;
}

/** Cria um vão-folha vazio (espaço sem frente, sem prateleiras, sem fundo). */
export function vaoVazio(id: string): BayNode {
  return { id, split: "none", qtdDivisorias: 0, content: { tipo: "espaco", frente: { tipo: "vazio" } } };
}
