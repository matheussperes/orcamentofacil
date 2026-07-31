"use client";

import { GabaritoLab } from "./GabaritoLab";
import { vaoVazio, type BoxModule } from "@/lib/engine/box/types";
import type { GabaritoRow } from "@/lib/gabarito/tipos";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — harness DEV-ONLY
// (`/dev/preview/biblioteca`), mesmo espírito de `CatalogoMock.tsx`: sem
// Supabase, exclusão no-op que simula espera de rede. Cobre GLOBAL +
// PRÓPRIO em categorias diferentes (pra exercitar o filtro) e uma categoria
// só com módulo global (pra exercitar "Excluir" escondido).
//
// `boxMock` não reaproveita `caixaInicial` de `app/modulo/EditorItemNucleo.tsx`
// de propósito — esse arquivo carrega o editor inteiro (accordion, canvas,
// custo ao vivo); importar só uma função dele puxaria o módulo inteiro pro
// bundle do harness sem necessidade. Shape mínimo válido de `BoxModule`
// reconstruído aqui (só os campos obrigatórios da interface).
function boxMock(overrides: Partial<BoxModule>): BoxModule {
  return {
    id: "mock",
    nome: "Módulo",
    tipo: "inferior",
    largura: 800,
    altura: 720,
    profundidade: 550,
    caixa: { cor: "Branco TX", espessura: 15 },
    raiz: vaoVazio("raiz"),
    portas: [],
    temFundo: true,
    puxador: "haste",
    ...overrides,
  };
}

const GABARITOS_MOCK: GabaritoRow[] = [
  {
    id: "global-1",
    organizacaoId: null,
    origemGabaritoId: null,
    nome: "Balcão 2 Portas",
    categoria: "Cozinha",
    definicao: boxMock({ nome: "Balcão 2 Portas", tipo: "inferior", largura: 800, altura: 720, profundidade: 550 }),
    criadoEm: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "global-2",
    organizacaoId: null,
    origemGabaritoId: null,
    nome: "Aéreo 2 Portas",
    categoria: "Cozinha",
    definicao: boxMock({ nome: "Aéreo 2 Portas", tipo: "aereo", largura: 800, altura: 700, profundidade: 350 }),
    criadoEm: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "global-3",
    organizacaoId: null,
    origemGabaritoId: null,
    nome: "Guarda-roupa 2 Portas",
    categoria: "Quarto",
    definicao: boxMock({ nome: "Guarda-roupa 2 Portas", tipo: "torre", largura: 900, altura: 2400, profundidade: 600 }),
    criadoEm: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "org-1",
    organizacaoId: "org-preview",
    origemGabaritoId: null,
    nome: "Nicho Sala de Estar",
    categoria: "Sala",
    definicao: boxMock({ nome: "Nicho Sala de Estar", tipo: "torre", largura: 600, altura: 1800, profundidade: 350 }),
    criadoEm: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "org-2",
    organizacaoId: "org-preview",
    origemGabaritoId: "global-1",
    nome: "Balcão 2 Portas (cópia)",
    categoria: "Cozinha",
    definicao: boxMock({ nome: "Balcão 2 Portas (cópia)", tipo: "inferior", largura: 800, altura: 720, profundidade: 550 }),
    criadoEm: "2026-01-06T00:00:00.000Z",
  },
];

async function esperar(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 300));
}

export function GabaritoMock() {
  async function onExcluirMock(): Promise<{ ok: boolean; erro?: string }> {
    await esperar();
    return { ok: true };
  }

  return <GabaritoLab gabaritosIniciais={GABARITOS_MOCK} onExcluir={onExcluirMock} />;
}

/** `?erro=1` do harness — exercita o estado ERRO de carregamento
 * (Design-System.md Seção 8), mesmo padrão de `?erro=1` em
 * `/dev/preview/catalogo`. */
export function GabaritoMockErro() {
  async function onNaoUsado(): Promise<{ ok: boolean; erro?: string }> {
    await esperar();
    return { ok: true };
  }

  return <GabaritoLab gabaritosIniciais={[]} erroCarregamento onExcluir={onNaoUsado} />;
}
