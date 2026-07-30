"use client";

import { useState } from "react";
import { Sidebar, type SidebarUser } from "./Sidebar";
import { Topbar } from "./Topbar";
import { PageHeaderProvider } from "./PageHeaderContext";

// Task 13.3b (contrato .maestro/tmp/13.3b-contract.md) — composição do shell
// autenticado v3 (Design-System.md Seção 6): sidebar + topbar + conteúdo.
// Client Component só por causa do estado do drawer mobile (Sidebar/Topbar
// também são client); `children` pode (e normalmente vai) ser uma árvore de
// Server Components — Next.js permite compor Server Components como
// `children` de um Client Component sem "clientizar" a árvore filha.
//
// Usado por `app/(app)/layout.tsx` (rotas autenticadas reais) e por
// `app/dev/preview/page.tsx` (harness com dados mock, sem Supabase) — ambos
// os consumidores só precisam passar `user`/`titulo`/`subtitulo`.
export interface ShellProps {
  user: SidebarUser;
  children: React.ReactNode;
}

export function Shell({ user, children }: ShellProps) {
  const [drawerAberto, setDrawerAberto] = useState(false);

  // Task 13.3c — `PageHeaderProvider` (ver PageHeaderContext.tsx) precisa
  // envolver TANTO a `Topbar` (que lê a sobrescrita) QUANTO `children` (de
  // onde a sobrescrita normalmente é disparada, ex.: `OrcamentoAbas`).
  return (
    <PageHeaderProvider>
      <div className="flex min-h-screen bg-cinza-50">
        <Sidebar
          user={user}
          mobileOpen={drawerAberto}
          onFecharMobile={() => setDrawerAberto(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onAbrirMenu={() => setDrawerAberto(true)} />
          <main className="flex-1 overflow-x-hidden p-xl">{children}</main>
        </div>
      </div>
    </PageHeaderProvider>
  );
}
