import { notFound } from "next/navigation";
import type { DadosPropostaPdf } from "@/lib/proposta-pdf/carregar";
import { PropostaPdfDocumento } from "@/components/proposta-pdf/PropostaPdfDocumento";
import { PropostaPdfVazio } from "@/components/proposta-pdf/PropostaPdfVazio";
import "@/app/proposta/[id]/pdf/proposta-pdf.css";

// Task 13.6b (contrato .maestro/tmp/13.6b-contract.md) — harness DEV-ONLY:
// renderiza `/proposta/[id]/pdf` com dados MOCK (sem Supabase), mesmo
// espírito de `app/dev/preview/orcamento/page.tsx` (Task 13.3c) e
// `app/dev/preview/page.tsx` (Task 13.3b). 404 em produção + rota pública
// no gate (`lib/auth/rotas.ts`). `?vazio=1` exercita o estado "nenhuma linha
// de proposta ainda" sem precisar zerar dados reais (mesmo padrão de
// `app/dev/preview/page.tsx`).
//
// Duas linhas de propósito: uma com imagem (`imagemUrlAssinada` preenchida
// — reaproveita `/logo/logo-dark.png` como estímulo visual só para checar
// dimensão/recorte da thumbnail, não é um render real de módulo) e uma sem
// imagem (`null`) para exercitar o placeholder `ImageIcon` sem quebrar a
// página.
const DADOS_MOCK: DadosPropostaPdf = {
  orcamentoId: "preview-orcamento",
  prazoEntrega: "25 dias úteis",
  organizacao: {
    nome: "Marcenaria Boa Vista",
    cnpj: "12.345.678/0001-90",
    endereco: "Rua das Acácias, 245 — Vila Madalena, São Paulo/SP",
    telefone: "(11) 4002-8922",
    logoUrl: null,
  },
  cliente: {
    nome: "Juliana Andrade",
    telefone: "(19) 99999-9999",
    endereco: "Av. Paulista, 1000, apto 52 — São Paulo/SP",
  },
  linhas: [
    {
      id: "linha-mock-1",
      titulo: "Cozinha",
      descricao: "Conjunto de móveis planejados em MDF branco TX com portas em madeira média, 4200mm x 2500mm.",
      valorRateado: 9850,
      imagemUrlAssinada: "/logo/logo-dark.png",
    },
    {
      id: "linha-mock-2",
      titulo: "Dormitório",
      descricao: "Guarda-roupa 3 portas de correr, 2700mm x 2400mm — render ainda não gerado.",
      valorRateado: 4250,
      imagemUrlAssinada: null,
    },
  ],
  total: 14100,
};

const DADOS_MOCK_VAZIO: DadosPropostaPdf = {
  ...DADOS_MOCK,
  linhas: [],
  total: 0,
};

export default function DevPreviewPropostaPdfPage({ searchParams }: { searchParams: { vazio?: string } }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const dados = searchParams.vazio ? DADOS_MOCK_VAZIO : DADOS_MOCK;

  if (dados.linhas.length === 0) {
    return <PropostaPdfVazio orcamentoId={dados.orcamentoId} />;
  }

  return <PropostaPdfDocumento dados={dados} />;
}
