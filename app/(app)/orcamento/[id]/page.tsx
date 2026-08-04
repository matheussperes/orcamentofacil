import { notFound } from "next/navigation";
import { buscarOrcamentoPorId } from "@/lib/orcamento/buscar";
import { carregarEstadoAmbiente } from "@/lib/ambiente/carregar";
import { buscarUltimaListaMaterial } from "@/lib/lista-material/buscarUltima";
import { carregarConfiguracaoPrecificacao } from "@/lib/precificacao/carregarConfiguracao";
import { carregarOuCriarLinhasProposta } from "@/lib/linha-proposta/carregar";
import { OrcamentoAbas } from "@/components/orcamento/OrcamentoAbas";
import { AmbientesTabConectada } from "@/components/ambientes/AmbientesTabConectada";
import { CorteMaterialTabConectada } from "@/components/orcamento/CorteMaterialTabConectada";
import { FinanceiroTabConectada } from "@/components/orcamento/FinanceiroTabConectada";
import { PropostaTabConectada } from "@/components/orcamento/PropostaTabConectada";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — shell de
// `/orcamento/[id]` com 4 abas. Server Component: busca o orçamento (RLS
// escopa por organização — `lib/orcamento/buscar.ts`) e devolve `notFound()`
// (404) quando não existe ou não pertence à organização do usuário (os dois
// casos são indistinguíveis de propósito, ver comentário de
// `buscarOrcamentoPorId`). O breadcrumb da Topbar ("Orçamentos / <nome do
// cliente>") é montado por `OrcamentoAbas` via `usePageHeader` — este
// componente não sabe de Topbar/Shell.
//
// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md): além do cabeçalho,
// esta página agora também carrega o estado profundo de Ambientes
// (`carregarEstadoAmbiente`, Supabase) e monta `AmbientesTabConectada` — o
// único ponto de I/O Supabase da aba "Ambientes" — para passar pra
// `OrcamentoAbas` via slot `abaAmbientes`.
//
// Task 13.4 (contrato .maestro/tmp/13.4-contract.md): a aba "Corte &
// Material" REAPROVEITA a MESMA chamada `carregarEstadoAmbiente` (não busca
// os dados de novo) — `estadoAmbiente.modulos`/`elementosContinuos` já tem
// tudo que o plano de corte/lista de material do orçamento inteiro precisa.
// Além disso lê `orcamento.frete` (já em `buscarOrcamentoPorId`, retrofit
// desta task) e a última linha de `lista_material` congelada
// (`buscarUltimaListaMaterial`, leitura nova e pequena — só metadado,
// nenhuma decisão de schema) para satisfazer "recarregar a página não perde
// a intenção".
//
// Task 13.5 (contrato .maestro/tmp/13.5-contract.md): a aba "Financeiro"
// também reaproveita `estadoAmbiente` (mesma chamada) e soma uma leitura
// nova pequena, `carregarConfiguracaoPrecificacao` (resolve
// `orcamento.modo_precificacao`/`modo_montagem`/`frete` contra os defaults
// de `organizacao.modo_precificacao_padrao`/`modo_montagem_padrao`) — passa
// pra `OrcamentoAbas` via slot `abaFinanceiro`.
//
// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md): a aba "Proposta"
// reaproveita `estadoAmbiente`/`configuracaoPrecificacao` (mesmas leituras,
// nenhuma duplicada) e soma `carregarOuCriarLinhasProposta` — que tanto LÊ
// as Linhas de Proposta já existentes quanto CRIA a linha default (D-17,
// "linha = ambiente") no primeiro carregamento, quando ainda não existe
// nenhuma — passa pra `OrcamentoAbas` via slot `abaProposta`.
export default async function OrcamentoPage({ params }: { params: { id: string } }) {
  const orcamento = await buscarOrcamentoPorId(params.id);

  if (!orcamento) {
    notFound();
  }

  const idCurto = orcamento.id.slice(0, 8).toUpperCase();
  const estadoAmbiente = await carregarEstadoAmbiente(orcamento.id);
  const ultimaCongeladaEm = await buscarUltimaListaMaterial(orcamento.id);
  const configuracaoPrecificacao = await carregarConfiguracaoPrecificacao(orcamento.id);
  const linhasProposta = await carregarOuCriarLinhasProposta(orcamento.id, estadoAmbiente);

  return (
    <OrcamentoAbas
      clienteNome={orcamento.clienteNome}
      clienteId={orcamento.clienteId}
      clienteTelefone={orcamento.clienteTelefone}
      clienteEndereco={orcamento.clienteEndereco}
      idCurto={idCurto}
      abaAmbientes={
        <AmbientesTabConectada orcamentoId={orcamento.id} estadoInicial={estadoAmbiente} />
      }
      abaCorteMaterial={
        <CorteMaterialTabConectada
          orcamentoId={orcamento.id}
          estadoInicial={estadoAmbiente}
          frete={orcamento.frete}
          ultimaCongeladaEmInicial={ultimaCongeladaEm}
        />
      }
      abaFinanceiro={
        <FinanceiroTabConectada
          orcamentoId={orcamento.id}
          estadoInicial={estadoAmbiente}
          configuracaoInicial={configuracaoPrecificacao}
        />
      }
      abaProposta={
        <PropostaTabConectada
          orcamentoId={orcamento.id}
          organizacaoId={linhasProposta.organizacaoId}
          estadoInicial={estadoAmbiente}
          configuracaoInicial={configuracaoPrecificacao}
          linhasIniciais={linhasProposta.linhas}
          congeladoEm={orcamento.congeladoEm}
        />
      }
    />
  );
}
