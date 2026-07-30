import { notFound } from "next/navigation";
import { buscarOrcamentoPorId } from "@/lib/orcamento/buscar";
import { OrcamentoAbas } from "@/components/orcamento/OrcamentoAbas";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — shell de
// `/orcamento/[id]` com 4 abas. Server Component: busca o orçamento (RLS
// escopa por organização — `lib/orcamento/buscar.ts`) e devolve `notFound()`
// (404) quando não existe ou não pertence à organização do usuário (os dois
// casos são indistinguíveis de propósito, ver comentário de
// `buscarOrcamentoPorId`). O breadcrumb da Topbar ("Orçamentos / <nome do
// cliente>") é montado por `OrcamentoAbas` via `usePageHeader` — este
// componente não sabe de Topbar/Shell.
export default async function OrcamentoPage({ params }: { params: { id: string } }) {
  const orcamento = await buscarOrcamentoPorId(params.id);

  if (!orcamento) {
    notFound();
  }

  const idCurto = orcamento.id.slice(0, 8).toUpperCase();

  return (
    <OrcamentoAbas orcamentoId={orcamento.id} clienteNome={orcamento.clienteNome} idCurto={idCurto} />
  );
}
