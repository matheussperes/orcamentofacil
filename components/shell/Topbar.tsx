"use client";

import { useRouter, usePathname } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTopbarHeaderOverride } from "./PageHeaderContext";

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
// mostrar por página. Cobre as rotas SEM dado dinâmico; `/orcamento/[id]`
// (Task 13.3c) precisa do nome do cliente, que só existe depois de uma
// consulta ao Supabase feita pelo Server Component da rota — para esse
// caso, o "mecanismo mais rico" que este comentário previa chegou:
// `PageHeaderContext.tsx` (`usePageHeader`), consumido via
// `useTopbarHeaderOverride` abaixo. Quando há sobrescrita ativa, ela vence
// o mapa estático.
const TITULOS_POR_ROTA: Record<string, { titulo: string; subtitulo?: string }> = {
  "/": { titulo: "Dashboard", subtitulo: "Visão geral dos seus orçamentos" },
  "/dev/preview": {
    titulo: "Dashboard",
    subtitulo: "Visão geral dos seus orçamentos (preview com dados mock)",
  },
  "/orcamento/novo": { titulo: "Novo orçamento" },
  "/dev/preview/orcamento/novo": { titulo: "Novo orçamento (preview)" },
  // Task 13.7a (contrato .maestro/tmp/13.7a-contract.md)
  "/perfil": { titulo: "Perfil", subtitulo: "Dados da organização e da sua conta" },
  "/dev/preview/perfil": {
    titulo: "Perfil",
    subtitulo: "Dados da organização e da sua conta (preview com dados mock)",
  },
};
const TITULO_PADRAO = { titulo: "OrçaFácil" };

export interface TopbarProps {
  onAbrirMenu: () => void;
}

export function Topbar({ onAbrirMenu }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const override = useTopbarHeaderOverride();
  const { titulo, subtitulo } = TITULOS_POR_ROTA[pathname] ?? TITULO_PADRAO;
  const breadcrumb = override?.breadcrumb;

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
          {breadcrumb && breadcrumb.length > 0 ? (
            // Só o ÚLTIMO segmento (nome do cliente, potencialmente longo)
            // recebe `min-w-0 flex-1 truncate` — os anteriores ("Orçamentos")
            // são curtos e fixos, então ficam `shrink-0` para nunca sumir
            // antes do segmento atual truncar (Design-System Seção 10:
            // nenhum overflow horizontal em qualquer largura ≥360px).
            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center text-corpo">
              {breadcrumb.map((segmento, i) => {
                const atual = i === breadcrumb.length - 1;
                return (
                  <span key={i} className={cn("flex items-center", atual && "min-w-0 flex-1")}>
                    {i > 0 && (
                      <span aria-hidden="true" className="mx-xs shrink-0 text-cinza-400">
                        /
                      </span>
                    )}
                    <span
                      className={cn(
                        atual
                          ? "min-w-0 flex-1 truncate font-medium text-cinza-900"
                          : "shrink-0 whitespace-nowrap text-cinza-500"
                      )}
                    >
                      {segmento.rotulo}
                    </span>
                  </span>
                );
              })}
            </nav>
          ) : (
            <>
              <h1 className="truncate text-display font-bold text-cinza-900">
                {override?.titulo ?? titulo}
              </h1>
              {(override?.subtitulo ?? subtitulo) && (
                <p className="truncate text-corpo text-cinza-500">
                  {override?.subtitulo ?? subtitulo}
                </p>
              )}
            </>
          )}
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
