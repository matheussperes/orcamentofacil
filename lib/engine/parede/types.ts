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
// ItemPosicionado, não usa faixa (Modelo de Domínio, Seção 3.2.2). `x`/`y`
// são sempre canônicos (borda esquerda/chão) — `refX`/`refY` são só
// preferência de leitura/escrita, ver `lib/engine/parede/referenciaMedida.ts`.
export interface ElementoParede {
  id: string;
  tipo: "janela" | "porta" | "tomada" | "ponto_hidraulico";
  nome?: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  refX: "esquerda" | "direita";
  refY: "chao" | "teto";
}

export interface Parede {
  id: string;
  altura: number;
  largura: number;
  /** Override CAMPO A CAMPO das 4 alturas de faixa (Modelo-de-Dominio Seção
   * 3.2.1, Q-1). Chave ausente/`null` = herdado do perfil da organização —
   * nunca uma cópia integral. Ver `alturasEfetivas` em `validar.ts`. */
  alturasOverride?: Partial<AlturasFaixas>;
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
