import type { MateriaisAmbiente, ParametrosFabrica } from "./types";
import type { ParametrosComerciais } from "./pricing";

// Defaults do wizard de onboarding Nível 2 (doc 07). São o ponto de partida;
// o tenant ajusta na configuração.

export const PARAMETROS_FABRICA_PADRAO: ParametrosFabrica = {
  ESPESSURA_CAIXA: 15,
  ESPESSURA_FRENTE: 18,
  ESPESSURA_FUNDO: 6,
  FOLGA_PORTA: 3,
  FOLGA_SUPERIOR: 3,
  FOLGA_INFERIOR: 3,
  RECUO_PRATELEIRA: 20,
  DESCONTO_CORREDICA: 20,
  VAO_CORREDICA: 13,
  LARGURA_PORTA_CANTO: 400,
  ALTURA_NICHOS_ELETRO: 700,
  PROFUNDIDADE_RASGO: 10,
  ALTURA_RODAPE: 100,
  RECUO_RODAPE: 50,
  perda_mdf: 0.12,
};

export const MATERIAIS_PADRAO: MateriaisAmbiente = {
  cor_caixa: "Branco TX",
  cor_frente: "Louro Freijó",
  cor_fundo: "Branco TX",
};

export const COMERCIAL_PADRAO: ParametrosComerciais = {
  margem: 0.35,
  impostos: 0.08,
  comissao: 0.03,
  desconto: 0,
  custosFixosIndiretos: 0,
  margemMinima: 0.2,
};
