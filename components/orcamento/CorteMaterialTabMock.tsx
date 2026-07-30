"use client";

import { CorteMaterialLab } from "./CorteMaterialLab";
import { alturasIniciais } from "@/lib/ambiente/estado";
import type { EstadoAmbiente } from "@/lib/ambiente/estado";
import type { ModuloOrcamento } from "@/lib/orcamento";
import type { ResultadoCongelarListaMaterial } from "@/lib/lista-material/congelar";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — harness DEV-ONLY
// (`/dev/preview/orcamento`): mesmo espírito de `AmbientesTabMock.tsx`
// (sem Supabase, sem sessão real) + "congelar" no-op (só simula espera de
// rede pra exercitar o feedback visual do botão).
//
// Diferença de escopo em relação a `AmbientesTabMock` (que usa
// `estadoAmbientePadrao()`, vazio): este harness usa um `EstadoAmbiente`
// POPULADO (2 módulos já posicionados, mesmas medidas dos presets seed de
// `lib/boxPresets.ts` — "Balcão 2 Portas"/"Gaveteiro 4 Gavetas") para o
// Maestro/UX Auditor conseguirem ver o estado "preenchido" do plano de
// corte/lista de material sem precisar montar itens manualmente na aba
// Ambientes do harness primeiro (que, por sua vez, começa vazia e não está
// conectada a este componente — cada aba do harness é um slot independente,
// mesma arquitetura da rota real). O estado "vazio" continua verificável
// trocando esta constante por `estadoAmbientePadrao()` — não removido, só
// não é o padrão do harness (mais útil para o gate visual mostrar a aba
// funcionando com dado real).
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

function estadoMockPreenchido(): EstadoAmbiente {
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

export function CorteMaterialTabMock() {
  async function onCongelarMock(): Promise<ResultadoCongelarListaMaterial> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { ok: true, congeladoEm: new Date().toISOString() };
  }

  return (
    <CorteMaterialLab
      orcamentoId="preview-orcamento"
      estadoInicial={estadoMockPreenchido()}
      frete={200}
      ultimaCongeladaEmInicial={null}
      onCongelar={onCongelarMock}
    />
  );
}
