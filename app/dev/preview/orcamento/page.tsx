import { notFound } from "next/navigation";
import { Shell } from "@/components/shell/Shell";
import { OrcamentoAbas } from "@/components/orcamento/OrcamentoAbas";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — harness DEV-ONLY:
// renderiza o shell `/orcamento/[id]` (4 abas, Ambientes viva) com um
// orçamento MOCK (sem Supabase), para o Maestro/UX Auditor navegarem sem
// sessão real. Mesma guarda de `app/dev/preview/page.tsx` (Task 13.3b): 404
// em produção + rota pública no gate (`lib/auth/rotas.ts`).
//
// `chavePrefixo="dev-preview-orcamento"` (dentro de `OrcamentoAbas` →
// `AmbientesLab`) isola o localStorage deste harness de qualquer orçamento
// real — nunca coincide com um uuid de verdade.
export default function DevPreviewOrcamentoPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <Shell user={{ nome: "Usuário de teste", organizacao: "Organização de teste" }}>
      <OrcamentoAbas
        orcamentoId="dev-preview-orcamento"
        clienteNome="Marcenaria Boa Vista"
        idCurto="PREVIEW1"
      />
    </Shell>
  );
}
