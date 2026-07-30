import { notFound } from "next/navigation";
import { Shell } from "@/components/shell/Shell";
import { NovoOrcamentoForm } from "@/components/orcamento/NovoOrcamentoForm";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — harness DEV-ONLY:
// renderiza o formulário de novo orçamento em `modoPreview` (valida os
// campos, mas não chama o Server Action de verdade — não há sessão/Supabase
// no preview). O fluxo de escrita real (criação de cliente + orçamento) só
// é testável pelo operador, com login de verdade — ver relatório da task.
// Mesma guarda de `app/dev/preview/page.tsx` (Task 13.3b): 404 em produção +
// rota pública no gate (`lib/auth/rotas.ts`).
export default function DevPreviewOrcamentoNovoPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <Shell user={{ nome: "Usuário de teste", organizacao: "Organização de teste" }}>
      <NovoOrcamentoForm modoPreview />
    </Shell>
  );
}
