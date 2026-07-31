import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

// Task 13.6b — estado vazio: orçamento existe mas ainda não tem nenhuma
// Linha de Proposta (usuário chegou por URL direta sem passar pela aba
// Proposta, que é quem cria a linha default — D-17). Diferente do resto do
// documento (CSS dedicado, Design-System.md Seção 7.22), este estado NÃO é
// parte do "papel" impresso — é uma tela de orientação do app, mesmo padrão
// Tailwind/shadcn do resto do produto e do padrão de vazio da Seção 8
// (ícone 32px cinza-300, título, descrição, botão primary de ação).
export function PropostaPdfVazio({ orcamentoId }: { orcamentoId: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-sm px-xl py-4xl text-center">
      <FileText className="h-8 w-8 text-cinza-300" aria-hidden="true" />
      <h1 className="text-titulo-card text-cinza-700">Nenhuma linha de proposta ainda</h1>
      <p className="text-corpo-pequeno text-cinza-500">
        Este orçamento ainda não tem nenhuma Linha de Proposta gerada. Volte para a aba Proposta do
        orçamento e clique em &quot;Gerar proposta&quot; para criar este documento.
      </p>
      <Button variant="primary" asChild>
        <Link href={`/orcamento/${orcamentoId}`}>Ir para o orçamento</Link>
      </Button>
    </div>
  );
}
