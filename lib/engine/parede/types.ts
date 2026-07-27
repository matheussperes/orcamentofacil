// Parede, Ambiente e posicionamento 1D com faixas (Modelo de Domínio, Seção
// 3.1/3.2; briefing 6.5/6.6). Validação de encaixe Tier 1 + Tier 2 — Tier 3
// (folgas técnicas, ergonomia, avisos contextuais) é decisão explícita do
// briefing para depois, não implementado aqui.

export type Faixa = "inferior" | "bancada" | "aereo" | "torre";

// Não há Y digitado (D-20) — cada item só guarda x (offset da borda esquerda
// da parede) e a faixa; Y é sempre derivado (ver `derivarY`).
export interface ItemPosicionado {
  itemId: string;
  x: number;
  faixa: Faixa;
}

// Retângulo com posição/dimensão ABSOLUTAS na parede — ao contrário de
// ItemPosicionado, não usa faixa (Modelo de Domínio, Seção 3.2).
export interface ElementoParede {
  tipo: "janela" | "porta" | "tomada" | "ponto_hidraulico";
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface Parede {
  id: string;
  altura: number;
  largura: number;
  elementos: ElementoParede[];
  itens: ItemPosicionado[];
}

export interface Ambiente {
  id: string;
  nome: string;
  paredes: Parede[];
}

// As 4 alturas do perfil da organização (organizacao.alturas_padrao, Task
// 11.1 — hoje jsonb vazio, sem shape fechado) necessárias para derivar Y a
// partir da faixa. O motor é função pura: essas alturas SEMPRE entram como
// parâmetro, nunca são buscadas/hardcoded aqui.
export interface AlturasFaixas {
  alturaRodape: number;
  alturaBancada: number;
  alturaInstalacaoAereo: number;
  peDireito: number;
}
