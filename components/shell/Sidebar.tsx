"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  BookOpen,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Package,
  Settings,
  User as UserIcon,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Task 13.3b (contrato .maestro/tmp/13.3b-contract.md) — Sidebar autenticada
// v3 (Design-System.md Seção 6 + 7.4). Componente NOVO, custom (sem
// primitivo shadcn — a própria Seção 7.4 diz isso).
//
// Itens de navegação — status "vivo" documentado no relatório da task:
// só "Dashboard" (`/`) e "Biblioteca" (`/biblioteca`) têm rota real hoje.
// Os demais (Orçamentos, Clientes, Catálogo, Perfil, Configurações) ainda
// não têm tela própria na nova IA — ficam como placeholder inativo
// (`href: null`), como o contrato pediu ("os sem rota ainda ficam
// inativos/placeholder"). Note que `/modulo`, `/ambientes` e
// `/configuracoes/materiais` (laboratórios já existentes, Stage 12/13
// anteriores) NÃO entram nesta lista — não são destinos do menu principal
// em `docs/Mapa-de-Telas.md`, são acessados a partir de dentro de um
// orçamento/fluxo específico.
interface ItemNav {
  rotulo: string;
  href: string | null;
  Icone: ComponentType<{ className?: string }>;
}

const ITENS_NAV: ItemNav[] = [
  { rotulo: "Dashboard", href: "/", Icone: LayoutDashboard },
  { rotulo: "Orçamentos", href: null, Icone: FileText },
  { rotulo: "Clientes", href: null, Icone: Users },
  { rotulo: "Biblioteca", href: "/biblioteca", Icone: BookOpen },
  { rotulo: "Catálogo", href: null, Icone: Package },
  { rotulo: "Perfil", href: null, Icone: UserIcon },
  { rotulo: "Configurações", href: null, Icone: Settings },
];

export interface SidebarUser {
  nome: string;
  organizacao: string;
}

interface SidebarProps {
  user: SidebarUser;
  /** Drawer off-canvas (< md, Design-System Seção 6). */
  mobileOpen: boolean;
  onFecharMobile: () => void;
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function Sidebar({ user, mobileOpen, onFecharMobile }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay do drawer — só existe (e intercepta clique) abaixo de `xl`. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-cinza-900/50 xl:hidden"
          onClick={onFecharMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-marinho-900 shadow-sidebar transition-transform duration-200 ease-out-back",
          "xl:sticky xl:top-0 xl:z-auto xl:h-screen xl:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Navegação principal"
      >
        <div className="p-lg">
          <Image
            src="/logo/logo-dark.png"
            alt="OrçaFácil"
            width={413}
            height={147}
            className="h-9 w-auto"
            priority
          />
        </div>

        <nav className="flex flex-col gap-xs px-lg" aria-label="Seções">
          {ITENS_NAV.map((item) => {
            const ativo = item.href !== null && pathname === item.href;
            const Icone = item.Icone;

            if (!item.href) {
              return (
                <span
                  key={item.rotulo}
                  aria-disabled="true"
                  title="Em breve"
                  className="flex h-10 cursor-not-allowed items-center gap-2 rounded-md px-2 text-corpo font-medium text-marinho-300 opacity-50"
                >
                  <Icone className="h-5 w-5" />
                  {item.rotulo}
                </span>
              );
            }

            return (
              <Link
                key={item.rotulo}
                href={item.href}
                onClick={onFecharMobile}
                className={cn(
                  "relative flex h-10 items-center gap-2 rounded-md px-2 text-corpo font-medium text-marinho-300 transition-colors duration-120 hover:bg-marinho-700 hover:text-cinza-0",
                  ativo && "bg-marinho-700 text-cinza-0"
                )}
                aria-current={ativo ? "page" : undefined}
              >
                {ativo && (
                  <span
                    className="absolute -left-lg top-0 h-full w-[3px] bg-accent-vivid"
                    aria-hidden="true"
                  />
                )}
                <Icone className={cn("h-5 w-5", ativo ? "text-accent-vivid" : "text-marinho-300")} />
                {item.rotulo}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Card de promoção (Design-System Seção 7.15) — microcopy aceita
            como está no mockup (Seção 11: informa capacidade real do
            produto, não é enfeite). */}
        <div className="mx-lg mb-lg rounded-lg bg-marinho-800 p-md">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-marinho-700">
            <Lightbulb className="h-5 w-5 text-accent-vivid" />
          </div>
          <p className="mt-2 text-corpo font-semibold text-cinza-0">Dica rápida</p>
          <p className="mt-1 text-corpo-pequeno text-marinho-300">
            Use conjuntos e elementos contínuos para agilizar seus projetos e reduzir retrabalho.
          </p>
        </div>

        <div className="flex items-center gap-2 border-t border-marinho-600 p-lg">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marinho-700 text-corpo-pequeno font-semibold text-cinza-0">
            {iniciais(user.nome)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-corpo-pequeno font-medium text-cinza-0">{user.nome}</p>
            <p className="truncate text-legenda text-marinho-300">{user.organizacao}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
