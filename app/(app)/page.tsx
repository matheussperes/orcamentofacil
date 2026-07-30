import { buscarDadosDashboard } from "@/lib/dashboard/orcamentos";
import { DashboardView } from "@/components/dashboard/DashboardView";

// Task 13.3b (contrato .maestro/tmp/13.3b-contract.md) — Dashboard `/`,
// SUBSTITUI o antigo `app/page.tsx` (editor single-page V1/V2, aposentado —
// ver nota de retrofit abaixo). Server Component: só busca os dados (Parte A
// do contrato, `lib/dashboard/orcamentos.ts`) e delega todo o render ao
// presentational `DashboardView` — fetch e render deliberadamente separados
// para o harness `/dev/preview` poder renderizar o mesmo `DashboardView` com
// dados mock, sem Supabase.
//
// Nota de retrofit (funcionalidade do `app/page.tsx` antigo sem equivalente
// ainda — reportada ao Maestro, não descartada): o editor V1/V2 tinha, numa
// única tela, (1) configuração de larguras de N paredes com
// `LayoutVisualizer`, (2) lista de módulos do orçamento inteiro (adicionar/
// duplicar/excluir via wizard Ambiente→Tipo→Modelo), (3) simulador comercial
// (margem/desconto) rodando `calcularPreco` sobre TODOS os módulos do
// orçamento, (4) tabela de insumos (BOM) consolidada do orçamento inteiro
// (`montarLinhasInsumos`), (5) plano de corte de TODOS os módulos juntos
// (`planoDeCorte` sobre `todasAsPecas(engine)`), e (6) um botão "Gerar
// proposta (PDF)" que gravava o resultado em `sessionStorage` e abria
// `/proposta`. Hoje: `/modulo` cobre (3)/(4)/(5) só para UM módulo isolado
// (editor de módulo), e `/ambientes` cobre posicionamento de itens numa
// parede + BOM só dos Elementos Contínuos da seleção atual — nenhuma tela
// nova faz a agregação de MÚLTIPLOS módulos num orçamento inteiro com
// preço/BOM/corte/proposta unificados. Essa funcionalidade fica sem
// equivalente até a Task 13.3c (criação real de orçamento) e a Task 13.5
// (motor de preço ligado à UI) avançarem — não foi recriada aqui porque
// está fora do escopo de "Shell + Dashboard" desta task, mas está registrada
// para não ser esquecida.
export default async function DashboardPage() {
  const dados = await buscarDadosDashboard();
  return <DashboardView {...dados} />;
}
