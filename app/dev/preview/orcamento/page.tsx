import { notFound } from "next/navigation";
import { Shell } from "@/components/shell/Shell";
import { OrcamentoAbas } from "@/components/orcamento/OrcamentoAbas";
import { AmbientesTabMock } from "@/components/ambientes/AmbientesTabMock";
import { CorteMaterialTabMock } from "@/components/orcamento/CorteMaterialTabMock";
import { FinanceiroTabMock } from "@/components/orcamento/FinanceiroTabMock";
import { PropostaTabMock } from "@/components/orcamento/PropostaTabMock";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — harness DEV-ONLY:
// renderiza o shell `/orcamento/[id]` (4 abas, Ambientes viva) com um
// orçamento MOCK (sem Supabase), para o Maestro/UX Auditor navegarem sem
// sessão real. Mesma guarda de `app/dev/preview/page.tsx` (Task 13.3b): 404
// em produção + rota pública no gate (`lib/auth/rotas.ts`).
//
// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md): a aba "Ambientes"
// agora é Supabase-backed na rota real — este harness continua isolado
// disso via `AmbientesTabMock` (estado padrão em memória + "salvar" no-op),
// exatamente pra não precisar de sessão/Supabase aqui.
//
// Task 13.4 (contrato .maestro/tmp/13.4-contract.md): mesmo princípio para
// "Corte & Material" — `CorteMaterialTabMock` (estado POPULADO em memória +
// "congelar" no-op), ver comentário daquele arquivo sobre a diferença de
// escopo em relação a `AmbientesTabMock`.
//
// Task 13.5 (contrato .maestro/tmp/13.5-contract.md): mesmo princípio para
// "Financeiro" — `FinanceiroTabMock` (mesmo `EstadoAmbiente` populado,
// configuração de precificação mock usando o padrão da org, "salvar" no-op).
//
// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md): mesmo princípio para
// "Proposta" — `PropostaTabMock` (mesmo `EstadoAmbiente` populado, sem
// Storage real — upload de imagem mockado com `URL.createObjectURL`).
export default function DevPreviewOrcamentoPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <Shell user={{ nome: "Usuário de teste", organizacao: "Organização de teste" }}>
      <OrcamentoAbas
        clienteNome="Marcenaria Boa Vista"
        idCurto="PREVIEW1"
        abaAmbientes={<AmbientesTabMock />}
        abaCorteMaterial={<CorteMaterialTabMock />}
        abaFinanceiro={<FinanceiroTabMock />}
        abaProposta={<PropostaTabMock />}
      />
    </Shell>
  );
}
