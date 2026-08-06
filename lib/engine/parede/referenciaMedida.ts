// Conversões canônico ↔ referência de medida (Modelo de Domínio, Seção
// 3.2.2, [V2.1] itens 2.9/2.10). O dado guardado (`ElementoParede.x`/`y`) é
// SEMPRE absoluto (borda esquerda/chão); `refX`/`refY` são só preferência de
// entrada/exibição — trocar a referência reescreve o número exibido e nunca
// move o elemento. Mesma forma de fórmula nos dois eixos (dimensão total −
// valor − tamanho do elemento), por isso uma função só cobre X e Y.

export type ReferenciaX = "esquerda" | "direita";
export type ReferenciaY = "chao" | "teto";

/** Converte um valor digitado (na referência escolhida) para a coordenada
 * canônica (sempre a partir da borda esquerda/chão). `dimensaoTotal` = L
 * (parede.largura) para X, H (parede.altura) para Y; `tamanhoElemento` =
 * largura do elemento para X, altura do elemento para Y. */
export function valorParaCanonico(
  valor: number,
  referencia: ReferenciaX | ReferenciaY,
  dimensaoTotal: number,
  tamanhoElemento: number
): number {
  return referencia === "esquerda" || referencia === "chao"
    ? valor
    : dimensaoTotal - valor - tamanhoElemento;
}

/** Converte a coordenada canônica para o valor exibido na referência
 * escolhida — inversa exata de `valorParaCanonico` (mesma fórmula: as duas
 * referências de cada eixo são simétricas em torno do mesmo cálculo). */
export function canonicoParaValor(
  canonico: number,
  referencia: ReferenciaX | ReferenciaY,
  dimensaoTotal: number,
  tamanhoElemento: number
): number {
  return referencia === "esquerda" || referencia === "chao"
    ? canonico
    : dimensaoTotal - canonico - tamanhoElemento;
}
