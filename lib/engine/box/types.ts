// V3 — Motor de caixa vazia + subdivisões (arquitetura CAD paramétrica).
// Cada módulo é uma caixa que o usuário subdivide recursivamente em vãos, e em
// cada vão-folha coloca conteúdo (portas, gavetas, prateleiras, etc.).

export type CarcassType = "aereo" | "inferior" | "torre";

export interface BoxMaterial {
  cor: string;
  espessura: number; // mm
}

export type SentidoPorta = "esquerda" | "direita" | "basculante" | "cava";

// Conteúdo de um vão-folha.
export type BayContent =
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
    }
  | { tipo: "prateleira"; qtd: number; recuo: number } // recuo frontal (mm)
  | { tipo: "fundo"; espessura: number }
  | {
      tipo: "tamponamento";
      lado: "direito" | "esquerdo" | "superior" | "inferior";
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
// instalação do módulo (não altera as peças internas da carcaça).
export interface TamponamentoInstancia {
  esquerdo: boolean;
  direito: boolean;
  superior: boolean;
  inferior: boolean;
  sarrafo: boolean; // true = quadro de sarrafos; false = chapa inteiriça
  material: BoxMaterial;
}

export interface BoxModule {
  id: string;
  nome: string;
  tipo: CarcassType;
  parede?: string;
  largura: number; // mm
  altura: number; // mm
  profundidade: number; // mm
  caixa: BoxMaterial; // cor + espessura da caixa interna (laterais, base, tampo…)
  raiz: BayNode;
  tamponamento?: TamponamentoInstancia; // override de instância (doc 12, Etapa 3)
}

/** Espessura lateral extra somada à largura de instalação (doc 12: decisão A). */
export function larguraInstalacaoBox(box: BoxModule): number {
  const t = box.tamponamento;
  if (!t) return box.largura;
  const esq = t.esquerdo ? t.material.espessura : 0;
  const dir = t.direito ? t.material.espessura : 0;
  return box.largura + esq + dir;
}

/** Cria um vão-folha vazio. */
export function vaoVazio(id: string): BayNode {
  return { id, split: "none", qtdDivisorias: 0, content: { tipo: "vazio" } };
}
