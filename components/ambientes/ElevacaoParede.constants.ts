import type { ElementoParede, Faixa } from "@/lib/engine/parede";

// Task R.5a — extraído de `ElevacaoParede.tsx` (decomposição pura, teto de
// 400 linhas/arquivo). Layout do SVG: margens reservadas pros rótulos de
// banda (esquerda), régua de largura (topo) e colunas de cota + bracket de
// "torre" (direita). Cores hardcoded em hex porque é desenho SVG, não classe
// Tailwind — mesmos tokens hex do Design-System (Seção 2.1 neutros / 2.2
// accent), mesmo padrão já documentado no topo de BoxCanvas.tsx.

export const ROTULO_FAIXA: Record<Faixa, string> = {
  inferior: "Inferior",
  bancada: "Meio",
  aereo: "Aéreo",
  torre: "Torre",
};

export const ROTULO_ELEMENTO: Record<ElementoParede["tipo"], string> = {
  janela: "Janela",
  porta: "Porta",
  tomada: "Tomada",
  ponto_hidraulico: "Hidráulico",
  // [Task 2.7] só satisfaz a exaustividade do Record — UI de "pedra" fica
  // fora do escopo desta task de motor puro.
  pedra: "Pedra",
};

export const SVG_W = 640;
export const SVG_H = 380;
export const MARGIN_LEFT = 92;
export const MARGIN_TOP = 40;
// Task 2.27 — margem alargada de 56 para 100: 3 colunas de cota empilhadas
// à direita da parede (altura total / altura de cada faixa / bracket da
// torre), cada uma com linha + seta + rótulo rotacionado, sem colidir.
export const MARGIN_RIGHT = 100;
export const MARGIN_BOTTOM = 16;
export const AREA_W = SVG_W - MARGIN_LEFT - MARGIN_RIGHT;
export const AREA_H = SVG_H - MARGIN_TOP - MARGIN_BOTTOM;

// Task 2.28-2.30 (RF-37/Q-3) — badge comercial (Linha de Proposta), distinto
// do handle/bracket de Conjunto (`informacao` `#2563EB`, BoxCanvas.tsx linhas
// 550-619): Design-System Seção 2.3 (`accent`), o mesmo par cor/fundo/borda
// já usado no badge de status "Enviado" (Seção 7.4, tabela de status) — chip
// preenchido em vez de linha/círculo, forma e cor diferentes do Conjunto.
export const TAG_COR = "#B45309"; // accent (Design-System Seção 2.3)
export const TAG_SUBTLE = "#FFF3E0"; // accent.subtle
export const TAG_BORDER = "#F3C88F"; // accent.border

export const CINZA_900 = "#0F172A";
export const CINZA_700 = "#334155";
export const CINZA_500 = "#64748B";
export const CINZA_400 = "#94A3B8";
export const CINZA_300 = "#CBD5E1";
export const CINZA_200 = "#E2E8F0";
export const CINZA_50 = "#F8FAFC";
export const CINZA_0 = "#FFFFFF";
