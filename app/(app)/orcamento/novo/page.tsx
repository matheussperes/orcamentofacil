import { NovoOrcamentoForm } from "@/components/orcamento/NovoOrcamentoForm";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — substitui o
// placeholder "Em construção" da Task 13.3b pelo formulário real de
// cliente + orçamento. Server Component trivial: só monta o Client
// Component do formulário dentro do shell (`app/(app)/layout.tsx`).
export default function NovoOrcamentoPage() {
  return <NovoOrcamentoForm />;
}
