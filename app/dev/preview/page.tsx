import { notFound } from "next/navigation";
import { Shell } from "@/components/shell/Shell";
import { DashboardView } from "@/components/dashboard/DashboardView";
import type { DadosDashboard } from "@/lib/dashboard/orcamentos";

// Task 13.3b (contrato .maestro/tmp/13.3b-contract.md) — harness de preview
// DEV-ONLY: renderiza o shell v3 + Dashboard presentational com dados MOCK
// (sem Supabase), só para auditoria visual (UX Auditor sobe a app e navega
// até aqui). Removível quando a Task 13.3 fechar (ou quando o Dashboard
// tiver dados reais suficientes em ambiente de desenvolvimento para não
// precisar mais de mock).
//
// Guarda dura: 404 em produção, redundante com a Vercel nunca servir builds
// de produção com `NODE_ENV !== "production"`, mas documentado no contrato
// como exigência explícita (defesa em profundidade caso a rota seja mesclada
// e o guard do `ROTAS_PUBLICAS` seja removido por engano no futuro).
//
// Público no gate de auth (`lib/auth/rotas.ts` — `ROTAS_PUBLICAS`): precisa
// renderizar sem sessão real, já que não usa `app/(app)/layout.tsx` (que
// busca perfil/organização de um usuário autenticado de verdade).
const ORCAMENTOS_MOCK: DadosDashboard["orcamentos"] = [
  {
    id: "mock-1",
    status: "rascunho",
    etapaEsteira: "novo",
    criadoEm: "2026-07-20T10:00:00.000Z",
    clienteNome: "Marcenaria Boa Vista",
    valorFinal: 4800,
    custoMaterial: 2400,
  },
  {
    id: "mock-2",
    status: "enviado",
    etapaEsteira: "novo",
    criadoEm: "2026-07-22T14:30:00.000Z",
    clienteNome: "Ana Paula Ribeiro",
    valorFinal: 12500,
    custoMaterial: 6250,
  },
  {
    id: "mock-3",
    status: "aprovado",
    etapaEsteira: "visita_agendada",
    criadoEm: "2026-07-18T09:15:00.000Z",
    clienteNome: "Construtora Alfa",
    valorFinal: 32000,
    custoMaterial: 16000,
  },
  {
    id: "mock-4",
    status: "recusado",
    etapaEsteira: "novo",
    criadoEm: "2026-07-10T08:00:00.000Z",
    clienteNome: "João Carlos Menezes",
    valorFinal: null,
    custoMaterial: null,
  },
  {
    id: "mock-5",
    status: "aprovado",
    etapaEsteira: "aguardando_aprovacao",
    criadoEm: "2026-07-25T16:45:00.000Z",
    clienteNome: "Studio Casa Nova",
    valorFinal: 7800,
    custoMaterial: 3900,
  },
];

const DADOS_MOCK: DadosDashboard = {
  orcamentos: ORCAMENTOS_MOCK,
  contagemPorStatus: {
    rascunho: 1,
    enviado: 1,
    aprovado: 2,
    recusado: 1,
  },
};

const DADOS_MOCK_VAZIO: DadosDashboard = {
  orcamentos: [],
  contagemPorStatus: { rascunho: 0, enviado: 0, aprovado: 0, recusado: 0 },
};

export default function DevPreviewPage({
  searchParams,
}: {
  searchParams: { vazio?: string };
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  // `?vazio=1` — auditoria do estado vazio (Design-System Seção 8) sem
  // precisar zerar dados reais no banco.
  const dados = searchParams.vazio ? DADOS_MOCK_VAZIO : DADOS_MOCK;

  return (
    <Shell user={{ nome: "Usuário de teste", organizacao: "Organização de teste" }}>
      <DashboardView {...dados} />
    </Shell>
  );
}
