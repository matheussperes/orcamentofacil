import { ImageIcon } from "lucide-react";
import { formatarMoeda } from "@/lib/format";
import type { LinhaPropostaPdf } from "@/lib/proposta-pdf/carregar";

// Task 13.6b — uma seção por Linha de Proposta: imagem (signed URL já
// resolvida no servidor, `lib/proposta-pdf/carregar.ts`), título, descrição
// e valor rateado (`accent-vivid`, D-25: NUNCA custo interno separado,
// só este número por linha). Imagem `null` (linha sem render ainda) mostra
// o mesmo placeholder de `Design-System.md` Seção 7.19, não quebra a página.
export function PropostaPdfLinha({ linha }: { linha: LinhaPropostaPdf }) {
  return (
    <article className="proposta-pdf__linha">
      <div className="proposta-pdf__linha-imagem">
        {linha.imagemUrlAssinada ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={linha.imagemUrlAssinada} alt={`Render de ${linha.titulo}`} />
        ) : (
          <ImageIcon className="proposta-pdf__linha-imagem-icone" width={32} height={32} aria-hidden="true" />
        )}
      </div>
      <div className="proposta-pdf__linha-conteudo">
        <h3 className="proposta-pdf__linha-titulo">{linha.titulo}</h3>
        <p className="proposta-pdf__linha-descricao">{linha.descricao || "Sem descrição."}</p>
        <p className="proposta-pdf__linha-valor">
          {linha.valorRateado === null ? "—" : formatarMoeda(linha.valorRateado)}
        </p>
      </div>
    </article>
  );
}
