"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — mecanismo "mais
// rico" que o comentário de `Topbar.tsx` (Task 13.3b) já previa: "cada
// page.tsx define seu próprio título via contexto/slot... fica para quando
// o shell cobrir rotas com estrutura mais variada (breadcrumb
// 'Orçamento #123 > Editor', Seção 6)". Chegou aqui: `/orcamento/[id]`
// precisa mostrar "Orçamentos / <nome do cliente>" na Topbar, e o nome do
// cliente só existe depois de uma consulta ao Supabase feita pelo Server
// Component da rota — o mapa estático por pathname (`TITULOS_POR_ROTA`) não
// tem como saber esse valor.
//
// Mecanismo: `Shell` provê o contexto (estado do "header ativo"); qualquer
// Client Component dentro da árvore pode chamar `usePageHeader(...)` para
// sobrescrever título/subtítulo/breadcrumb enquanto estiver montado —
// `Topbar` lê a sobrescrita e cai de volta no mapa estático por pathname
// quando não há nenhuma (páginas simples, sem dado dinâmico).

export interface Breadcrumb {
  rotulo: string;
  href?: string;
}

export interface PageHeader {
  titulo?: string;
  subtitulo?: string;
  /** Quando presente, a Topbar renderiza o breadcrumb em vez de
   * título/subtítulo (Design-System Seção 6: "breadcrumb quando dentro de
   * um orçamento/item"). Último item = segmento atual (sem link). */
  breadcrumb?: Breadcrumb[];
}

interface PageHeaderContextValue {
  header: PageHeader | null;
  setHeader: (header: PageHeader | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeader | null>(null);
  const value = useMemo(() => ({ header, setHeader }), [header]);
  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

function usePageHeaderContext(): PageHeaderContextValue {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) {
    throw new Error(
      "usePageHeader/useTopbarHeaderOverride precisam estar dentro de <Shell> (PageHeaderProvider)."
    );
  }
  return ctx;
}

/** Chamado por um Client Component de uma page (ex.: `OrcamentoAbas`) para
 * sobrescrever o que a Topbar mostra enquanto ele estiver montado. Limpa a
 * sobrescrita automaticamente ao desmontar (a Topbar volta pro mapa estático
 * baseado em pathname). */
export function usePageHeader(header: PageHeader): void {
  const { setHeader } = usePageHeaderContext();
  // Serializa pra uma dependência estável — evita re-disparar o efeito a
  // cada render só porque o chamador passou um objeto/array literal novo
  // (breadcrumb é um array criado inline na maioria dos usos).
  const chave = JSON.stringify(header);
  useEffect(() => {
    setHeader(header);
    return () => setHeader(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
}

/** Consumido só pela `Topbar`. */
export function useTopbarHeaderOverride(): PageHeader | null {
  return usePageHeaderContext().header;
}
