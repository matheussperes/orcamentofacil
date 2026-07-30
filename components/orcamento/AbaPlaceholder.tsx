import { Construction } from "lucide-react";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — placeholder das 3
// abas ainda não implementadas de `/orcamento/[id]` (Corte & Material,
// Financeiro, Proposta). Mesmo padrão visual do placeholder "Em construção"
// de `/orcamento/novo` (Task 13.3b).
export interface AbaPlaceholderProps {
  titulo: string;
  /** Número da task futura responsável por esta aba (citado no texto, para
   * quem ler o código/UI achar a task certa). */
  task: string;
}

export function AbaPlaceholder({ titulo, task }: AbaPlaceholderProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-cinza-200 bg-cinza-0 p-3xl text-center shadow-xs">
      <Construction className="h-8 w-8 text-cinza-300" aria-hidden="true" />
      <h2 className="text-titulo-card text-cinza-700">{titulo} — Em construção</h2>
      <p className="max-w-sm text-corpo-pequeno text-cinza-500">
        Esta aba será implementada na Task {task}.
      </p>
    </div>
  );
}
