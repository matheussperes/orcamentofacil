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
}

/** Cria um vão-folha vazio. */
export function vaoVazio(id: string): BayNode {
  return { id, split: "none", qtdDivisorias: 0, content: { tipo: "vazio" } };
}
