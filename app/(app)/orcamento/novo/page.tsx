import Link from "next/link";
import { Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";

// Task 13.3b (contrato .maestro/tmp/13.3b-contract.md) — decisão sobre o CTA
// "Novo orçamento" do Dashboard: em vez de desabilitar o botão ou apontar
// pra um link morto, o contrato ofereceu "rotear pra placeholder
// /orcamento/novo" como opção — escolhida aqui. A criação REAL de orçamento
// (formulário, persistência via Supabase) é a Task 13.3c; esta página só
// evita um 404 no meio do fluxo principal do Dashboard enquanto isso não
// chega, dentro do shell (mesma navegação/chrome, `app/(app)/`).
export default function NovoOrcamentoPage() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-cinza-200 bg-cinza-0 p-3xl text-center shadow-xs">
      <Hammer className="h-8 w-8 text-cinza-300" aria-hidden="true" />
      <h2 className="text-titulo-card text-cinza-700">Em construção</h2>
      <p className="max-w-sm text-corpo-pequeno text-cinza-500">
        A criação de orçamento ainda não está disponível nesta versão. Volte para o Dashboard para
        acompanhar os orçamentos existentes.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Voltar ao Dashboard</Link>
      </Button>
    </div>
  );
}
