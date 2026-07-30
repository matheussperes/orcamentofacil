import { alturasIniciais, type EstadoAmbiente } from "./estado";
import type { ModuloOrcamento } from "@/lib/orcamento";

// Task 13.5 (contrato .maestro/tmp/13.5-contract.md) — extraído de
// `components/orcamento/CorteMaterialTabMock.tsx` (Task 13.4): fixture de
// `EstadoAmbiente` POPULADO (2 módulos, mesmas medidas dos presets seed de
// `lib/boxPresets.ts` — "Balcão 2 Portas"/"Gaveteiro 4 Gavetas") usado pelo
// harness `/dev/preview/orcamento` em MAIS de uma aba agora (Corte &
// Material e, a partir desta task, Financeiro) — em vez de duplicar o
// fixture pela segunda vez, ele vira compartilhado.
const BALCAO_MOCK: ModuloOrcamento = {
  origem: "custom_box",
  box: {
    id: "mock-balcao",
    nome: "Balcão 2 Portas",
    tipo: "inferior",
    largura: 800,
    altura: 720,
    profundidade: 550,
    caixa: { cor: "Branco TX", espessura: 15 },
    temFundo: true,
    puxador: "haste",
    raiz: {
      id: "mock-balcao-raiz",
      split: "none",
      qtdDivisorias: 0,
      content: { tipo: "espaco", frente: { tipo: "vazio" }, prateleiras: { qtd: 1, recuo: 20 } },
    },
    portas: [
      {
        id: "mock-balcao-porta",
        alvo: { tipo: "vaos", vaoIds: ["mock-balcao-raiz"] },
        tipoAbertura: "abrir",
        sentido: "direita",
        qtd: 2,
        material: { cor: "Louro Freijó", espessura: 18 },
      },
    ],
  },
};

const GAVETEIRO_MOCK: ModuloOrcamento = {
  origem: "custom_box",
  box: {
    id: "mock-gaveteiro",
    nome: "Gaveteiro 4 Gavetas",
    tipo: "inferior",
    largura: 450,
    altura: 720,
    profundidade: 550,
    caixa: { cor: "Branco TX", espessura: 15 },
    temFundo: false,
    puxador: "haste",
    raiz: {
      id: "mock-gaveteiro-raiz",
      split: "none",
      qtdDivisorias: 0,
      content: {
        tipo: "espaco",
        frente: {
          tipo: "gaveta",
          qtd: 4,
          profundidade: 500,
          interna: false,
          corFrente: "Louro Freijó",
          espessuraFrente: 18,
        },
      },
    },
    portas: [],
  },
};

export function estadoMockPreenchido(): EstadoAmbiente {
  return {
    parede: {
      id: "parede-mock",
      largura: 1400,
      altura: 2700,
      elementos: [],
      itens: [
        { itemId: "mock-balcao", x: 0, faixa: "inferior" },
        { itemId: "mock-gaveteiro", x: 800, faixa: "inferior" },
      ],
    },
    modulos: [BALCAO_MOCK, GAVETEIRO_MOCK],
    alturas: alturasIniciais(),
    elementosContinuos: [],
    overrides: [],
  };
}
