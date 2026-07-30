"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// Task 13.3b (contrato .maestro/tmp/13.3b-contract.md) — Topbar autenticada
// v3 (Design-System.md Seção 6 + 7.5). Componente NOVO, custom.
//
// Decisão do Frontend Engineer sobre o logout (o contrato permitia "dropdown
// de conta OU ação de topbar"): ação de topbar direta (botão "Sair"), não
// dropdown — evita introduzir um primitivo `DropdownMenu`/`Popover` novo
// (nenhum dos dois existe em `components/ui` nem em `package.json` ainda;
// Sidebar já mostra nome/organização no rodapé para o contexto de conta que
// o dropdown daria). Sino de notificação (7.16) e seletor de organização
// (7.17) também ficaram de fora desta task — nenhuma feature real por trás
// deles ainda (sem notificações, sem multi-org por usuário na UI); construir
// os dois agora seria UI decorativa sem dado real. Documentado no relatório
// da task.
//
// Título/subtítulo: resolvidos por rota (mapa simples abaixo, via
// `usePathname`) em vez de recebidos como prop obrigatória de quem monta o
// `Shell` — `app/(app)/layout.tsx` envolve MAIS de uma rota (Dashboard +
// placeholder "Novo orçamento"), então o layout sozinho não sabe qual título
// mostrar por página. Mecanismo mais rico (cada `page.tsx` define seu
// próprio título via contexto/slot) fica para quando o shell cobrir rotas
// com estrutura mais variada (breadcrumb "Orçamento #123 > Editor", Seção 6)
// — hoje só 2 rotas simples usam isso, um mapa já resolve sem
// over-engineering.
const TITULOS_POR_ROTA: Record<string, { titulo: string; subtitulo?: string }> = {
  "/": { titulo: "Dashboard", subtitulo: "Visão geral dos seus orçamentos" },
  "/dev/preview": {
    titulo: "Dashboard",
    subtitulo: "Visão geral dos seus orçamentos (preview com dados mock)",
  },
  "/orcamento/novo": { titulo: "Novo orçamento" },
};
const TITULO_PADRAO = { titulo: "OrçaFácil" };

export interface TopbarProps {
  onAbrirMenu: () => void;
}

export function Topbar({ onAbrirMenu }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { titulo, subtitulo } = TITULOS_POR_ROTA[pathname] ?? TITULO_PADRAO;

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-cinza-200 bg-cinza-0 px-xl">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onAbrirMenu}
          className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-cinza-600 hover:bg-cinza-100 xl:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-display font-bold text-cinza-900">{titulo}</h1>
          {subtitulo && <p className="truncate text-corpo text-cinza-500">{subtitulo}</p>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" onClick={sair}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}
