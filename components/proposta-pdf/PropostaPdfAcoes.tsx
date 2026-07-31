"use client";

import Link from "next/link";
import { Printer } from "lucide-react";

// Task 13.6b — barra de ações do documento (fora do "papel" em si): botão
// "Imprimir / Salvar em PDF" (`window.print()`, mesmo mecanismo do V1,
// `app/proposta/page.tsx`) + link de volta para a aba Proposta do
// orçamento. Some inteiro no `@media print` (`.proposta-pdf__acoes`).
export function PropostaPdfAcoes({ orcamentoId }: { orcamentoId: string }) {
  return (
    <div className="proposta-pdf__acoes">
      <Link href={`/orcamento/${orcamentoId}`} className="proposta-pdf__voltar">
        ← Voltar para o orçamento
      </Link>
      <button type="button" className="proposta-pdf__botao-imprimir" onClick={() => window.print()}>
        <Printer className="h-4 w-4" aria-hidden="true" />
        Imprimir / Salvar em PDF
      </button>
    </div>
  );
}
