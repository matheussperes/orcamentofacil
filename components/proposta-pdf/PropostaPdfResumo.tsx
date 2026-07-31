"use client";

import { useState } from "react";
import { formatarMoeda } from "@/lib/format";

// Task 13.6b — prazo de entrega, forma de pagamento (editável) e total.
//
// Decisão de escopo sobre forma de pagamento (D-09, "à vista/parcelado,
// texto livre" — contrato deixou explicitamente como decisão do executor,
// "não há coluna no schema pra isso"): fica em `useState` LOCAL, client-side
// apenas, NÃO sobrevive a reload/navegação. Motivo: persistir exigiria
// coluna nova em `orcamento` (fora de escopo desta task — "se concluir que
// precisa de coluna/tabela nova, PARE e reporte ao Maestro") ou sobrecarregar
// um campo jsonb já usado para outra coisa, que seria uma decisão de
// arquitetura de dados igualmente fora do escopo do Frontend Engineer.
// Trade-off aceito: quem gera o PDF preenche a forma de pagamento a cada
// visita à tela antes de imprimir — igual ao "editável na hora de gerar" que
// o Mapa-de-Telas.md Seção 3.8 já descreve para os campos pré-preenchidos
// (nenhum outro campo desta tela é persistido a partir de edição feita
// aqui, então este não é uma exceção ao padrão da tela).
export function PropostaPdfResumo({ prazoEntrega, total }: { prazoEntrega: string | null; total: number }) {
  const [formaPagamento, setFormaPagamento] = useState("");

  return (
    <section className="proposta-pdf__resumo">
      <div className="proposta-pdf__resumo-campo">
        <span className="proposta-pdf__resumo-rotulo">Prazo de entrega</span>
        <span className="proposta-pdf__resumo-valor">{prazoEntrega ?? "A combinar"}</span>
      </div>

      <div className="proposta-pdf__resumo-campo">
        <label htmlFor="forma-pagamento" className="proposta-pdf__resumo-rotulo">
          Forma de pagamento
        </label>
        <textarea
          id="forma-pagamento"
          className="proposta-pdf__forma-pagamento"
          placeholder="Ex.: 50% de entrada e 50% na entrega, ou em até 3x sem juros"
          value={formaPagamento}
          onChange={(evento) => setFormaPagamento(evento.target.value)}
        />
      </div>

      <div className="proposta-pdf__total">
        <span className="proposta-pdf__total-rotulo">Total da proposta</span>
        <span className="proposta-pdf__total-valor">{formatarMoeda(total)}</span>
      </div>
    </section>
  );
}
