import Link from "next/link";
import { Clock, FileText, Wallet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiCard } from "./KpiCard";
import { StatusOrcamentoBadge } from "./StatusOrcamentoBadge";
import type { DadosDashboard } from "@/lib/dashboard/orcamentos";

// Task 13.3b (contrato .maestro/tmp/13.3b-contract.md) — Dashboard
// PRESENTATIONAL (fetch e render separados de propósito): recebe
// `DadosDashboard` já pronto, não sabe de Supabase. Consumido por
// `app/(app)/page.tsx` (dados reais, Server Component busca via
// `lib/dashboard/orcamentos.ts`) e por `app/dev/preview/page.tsx` (dados
// MOCK, harness de auditoria visual — mesmo componente, sem duplicar nada).
//
// Referência visual: `docs/Imagem das Telas/3.Dashboard.png`.

const FORMATADOR_DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function formatarData(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : FORMATADOR_DATA.format(d);
}

export function DashboardView({ orcamentos, contagemPorStatus }: DadosDashboard) {
  const total = orcamentos.length;
  const aprovados = contagemPorStatus.aprovado;
  const emAberto = contagemPorStatus.rascunho + contagemPorStatus.enviado;

  return (
    <div className="flex flex-col gap-xl">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <div>
          <h2 className="text-titulo-secao text-cinza-900">Visão geral</h2>
          <p className="text-corpo text-cinza-500">
            Acompanhe seus orçamentos e o status de cada um.
          </p>
        </div>
        <Button asChild>
          <Link href="/orcamento/novo">Novo orçamento</Link>
        </Button>
      </div>

      {/* KPIs — Design-System Seção 7.3/2.6. Valor monetário ("Faturamento")
          depende do motor de precificação (Task 13.5, ainda não ligado) —
          placeholder "—" documentado no contrato, não bloqueante. */}
      <div className="grid grid-cols-1 gap-xl sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard posicao={1} rotulo="Orçamentos" valor={String(total)} Icone={FileText} />
        <KpiCard posicao={2} rotulo="Aprovados" valor={String(aprovados)} Icone={CheckCircle2} />
        <KpiCard posicao={3} rotulo="Em aberto" valor={String(emAberto)} Icone={Clock} />
        <KpiCard posicao={4} rotulo="Faturamento" valor="—" Icone={Wallet} />
      </div>

      <div className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <h2 className="mb-3 text-titulo-secao text-cinza-900">Orçamentos recentes</h2>

        {orcamentos.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-3xl text-center">
            <FileText className="h-8 w-8 text-cinza-300" aria-hidden="true" />
            <p className="text-titulo-card text-cinza-700">Nenhum orçamento ainda</p>
            <p className="max-w-sm text-corpo-pequeno text-cinza-500">
              Os orçamentos que você criar aparecem aqui, organizados por status.
            </p>
            <Button asChild className="mt-2">
              <Link href="/orcamento/novo">Novo orçamento</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo de entrega</TableHead>
                  <TableHead className="text-right">Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orcamentos.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium text-cinza-900">{o.clienteNome}</TableCell>
                    <TableCell>
                      <StatusOrcamentoBadge status={o.status} />
                    </TableCell>
                    <TableCell>{o.prazoEntrega ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatarData(o.criadoEm)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
