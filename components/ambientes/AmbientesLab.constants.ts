// Task R.3a — constantes extraídas de AmbientesLab.tsx (decomposição pura,
// sem mudança de comportamento). Rótulos de exibição e listas fixas usados
// pelo componente e por seus subcomponentes de seção.
import type { ElementoParede, Faixa, ReferenciaVao } from "@/lib/engine/parede";
import type { ReferenciaX, ReferenciaY } from "@/lib/engine/parede/referenciaMedida";
import type { AlturasFaixas } from "@/lib/engine/parede";
import type { PosicaoElemento, TipoElementoContinuo, ModeloTampo } from "@/lib/engine/elemento-continuo/types";

export const TIPOS_ELEMENTO: ElementoParede["tipo"][] = ["janela", "porta", "tomada", "ponto_hidraulico", "pedra"];
export const ROTULO_TIPO_ELEMENTO: Record<ElementoParede["tipo"], string> = {
  janela: "Janela",
  porta: "Porta",
  tomada: "Tomada",
  ponto_hidraulico: "Ponto hidráulico",
  pedra: "Pedra",
};

// Modelo de Domínio 3.2.2 ([V2.1] itens 2.9/2.11) — rótulos exatos, nunca
// "X"/"Y" na tela.
export const ROTULO_REF_X: Record<ReferenciaX, string> = {
  esquerda: "Distância da parede esquerda",
  direita: "Distância da parede direita",
};
export const ROTULO_REF_Y: Record<ReferenciaY, string> = {
  chao: "Altura do chão",
  teto: "Distância do teto",
};

// Task 2.18 (front) — mesmo espírito de nomenclatura acima, mas para o vão
// até o vizinho (Modelo de Domínio 3.1.1), não a distância até a parede.
export const ROTULO_REF_VAO: Record<ReferenciaVao, string> = {
  esquerda: "Distância do vizinho à esquerda",
  direita: "Distância do vizinho à direita",
};

export const FAIXAS: Faixa[] = ["inferior", "bancada", "aereo", "torre"];
export const ROTULO_FAIXA: Record<Faixa, string> = {
  inferior: "Inferior",
  bancada: "Meio",
  aereo: "Aéreo",
  torre: "Torre",
};

// Task 2.3-2.6 (alturas) — os 4 campos de altura de faixa (Modelo-de-Domínio
// Seção 3.2.1), na mesma ordem já usada pelo card "Alturas do perfil".
export const CAMPOS_ALTURA: { campo: keyof AlturasFaixas; rotulo: string; id: string }[] = [
  { campo: "alturaRodape", rotulo: "Rodapé (mm)", id: "override-altura-rodape" },
  { campo: "alturaBancada", rotulo: "Meio (mm)", id: "override-altura-bancada" },
  { campo: "alturaInstalacaoAereo", rotulo: "Instalação aéreo (mm)", id: "override-altura-aereo" },
  { campo: "peDireito", rotulo: "Limite superior do aéreo (mm)", id: "override-pe-direito" },
];

// Task 13.2c — painel lateral de Elemento Contínuo. Rótulos de exibição.
export const ROTULO_TIPO_ELEMENTO_CONTINUO: Record<TipoElementoContinuo, string> = {
  tampo: "Tampo",
  rodape: "Rodapé",
  tamponamento: "Tamponamento",
  fechamento: "Fechamento",
};
export const ROTULO_POSICAO_ELEMENTO: Record<PosicaoElemento, string> = {
  superior: "Superior",
  base: "Base",
  esquerda: "Esquerda",
  direita: "Direita",
  topo: "Topo",
};
// Task 3.10–3.11 (front) — seletor "Modelo", só para tipo "tampo".
export const ROTULO_MODELO_TAMPO: Record<ModeloTampo, string> = {
  simples: "Simples",
  engrossado: "Engrossado",
  dobrado: "Dobrado",
};
