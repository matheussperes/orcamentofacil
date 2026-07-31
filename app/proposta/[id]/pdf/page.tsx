import { notFound } from "next/navigation";
import { carregarDadosPropostaPdf } from "@/lib/proposta-pdf/carregar";
import { PropostaPdfDocumento } from "@/components/proposta-pdf/PropostaPdfDocumento";
import { PropostaPdfVazio } from "@/components/proposta-pdf/PropostaPdfVazio";
import "./proposta-pdf.css";

// Task 13.6b (contrato .maestro/tmp/13.6b-contract.md) — fecha a Task 13.6
// inteira (13.6a Linhas de Proposta + 13.6b esta): documento imprimível A4
// com dados reais de Organização (emitente) + Cliente + Linhas de Proposta
// já congeladas. `PropostaLab.handleGerarProposta` (Task 13.6a, já mesclada)
// navega para cá depois de congelar `valor_rateado` de cada linha.
//
// Segmento dinâmico dentro de `app/proposta/` — coexiste com
// `app/proposta/page.tsx` (V1, sessionStorage) sem conflito. NÃO fica
// dentro de `app/(app)/`: é um documento standalone, sem sidebar/topbar do
// shell (mesmo espírito do `/proposta` V1) — mas continua atrás do gate de
// auth por padrão (não está em `lib/auth/rotas.ts::ROTAS_PUBLICAS`, só o
// dono da organização vê/imprime, nunca o cliente final, D-18).
//
// `carregarDadosPropostaPdf` devolve `null` nos mesmos casos indistinguíveis
// de `buscarOrcamentoPorId` (não existe / não é da sua organização / RLS) —
// tratado como 404. Quando o orçamento existe mas ainda não tem NENHUMA
// Linha de Proposta (usuário chegou por URL direta sem passar pela aba
// Proposta), `dados.linhas` vem vazio — isso NÃO é 404, é o estado vazio
// real da tela (`PropostaPdfVazio`).
export default async function PropostaPdfPage({ params }: { params: { id: string } }) {
  const dados = await carregarDadosPropostaPdf(params.id);

  if (!dados) {
    notFound();
  }

  if (dados.linhas.length === 0) {
    return <PropostaPdfVazio orcamentoId={dados.orcamentoId} />;
  }

  return <PropostaPdfDocumento dados={dados} />;
}
