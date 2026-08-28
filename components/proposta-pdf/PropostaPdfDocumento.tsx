import { TracoDeCota } from "@/components/ui/traco-de-cota";
import type { DadosPropostaPdf } from "@/lib/proposta-pdf/carregar";
import { PropostaPdfAcoes } from "./PropostaPdfAcoes";
import { PropostaPdfCabecalho } from "./PropostaPdfCabecalho";
import { PropostaPdfCliente } from "./PropostaPdfCliente";
import { PropostaPdfLinha } from "./PropostaPdfLinha";
import { PropostaPdfResumo } from "./PropostaPdfResumo";
import { PropostaPdfCitacao } from "./PropostaPdfCitacao";
import { PropostaPdfRodape } from "./PropostaPdfRodape";

// Task 13.6b — composição do documento imprimível inteiro. Decomposto em
// peças pequenas (Cabeçalho/Cliente/Linha/Resumo/Citação/Rodapé/Ações), cada
// uma com uma única responsabilidade, em vez de um único arquivo monolítico
// de JSX (proibição do papel do Frontend Engineer). Usado tanto pela rota
// real (`app/proposta/[id]/pdf/page.tsx`) quanto pelo harness
// (`app/dev/preview/proposta-pdf/page.tsx`) — os dois só diferem na origem
// dos dados (`DadosPropostaPdf`) e importam `proposta-pdf.css` +
// `proposta-pdf-responsive.css` (Task R.5e — bloco `@media (max-width:
// 767px)` extraído para não estourar o teto de 400 linhas) no próprio
// arquivo de página (mesmo padrão de import por página do V1,
// `app/proposta/page.tsx`), nunca aqui — este componente é só apresentação.
export function PropostaPdfDocumento({ dados }: { dados: DadosPropostaPdf }) {
  return (
    <div className="proposta-pdf">
      <PropostaPdfAcoes orcamentoId={dados.orcamentoId} />

      <div className="proposta-pdf__documento">
        <PropostaPdfCabecalho organizacao={dados.organizacao} />

        <div className="proposta-pdf__corpo">
          <PropostaPdfCliente cliente={dados.cliente} />

          <section>
            <h2 className="proposta-pdf__secao-titulo">Ambientes orçados</h2>
            <TracoDeCota className="mb-md" />
            <div className="proposta-pdf__linhas">
              {dados.linhas.map((linha) => (
                <PropostaPdfLinha key={linha.id} linha={linha} />
              ))}
            </div>
          </section>

          <PropostaPdfResumo prazoEntrega={dados.prazoEntrega} total={dados.total} />

          <PropostaPdfCitacao />
        </div>

        <PropostaPdfRodape />
      </div>
    </div>
  );
}
