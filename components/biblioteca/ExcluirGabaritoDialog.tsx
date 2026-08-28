"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — confirmação
// destrutiva de "Excluir módulo" em `/biblioteca` (Design-System.md Seção
// 7.11/11: nunca `window.confirm`, nomeia o que será perdido, irreversível
// por escrito), mesmo padrão de `components/catalogo/AlternarAtivoDialog.tsx`.
// Só é renderizado pelo chamador (`GabaritoCard`) para gabaritos da PRÓPRIA
// org — nunca aparece numa linha global.
export interface ExcluirGabaritoDialogProps {
  nomeGabarito: string;
  onConfirmar: () => Promise<{ ok: boolean; erro?: string }>;
}

export function ExcluirGabaritoDialog({ nomeGabarito, onConfirmar }: ExcluirGabaritoDialogProps) {
  const [aberto, setAberto] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setExecutando(true);
    setErro(null);
    const resultado = await onConfirmar();
    setExecutando(false);
    if (resultado.ok) {
      setAberto(false);
    } else {
      setErro(resultado.erro ?? "Não foi possível excluir este módulo.");
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v) setErro(null);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="danger"
          size="icon"
          className="h-7 w-7"
          aria-label={`Excluir ${nomeGabarito}`}
          title="Excluir módulo"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent tamanho="confirmacao">
        <DialogHeader>
          <DialogTitle>Excluir módulo?</DialogTitle>
        </DialogHeader>
        <p className="text-corpo-pequeno text-cinza-800">
          Excluir &quot;{nomeGabarito}&quot; remove este gabarito da sua biblioteca. Esta ação não
          pode ser desfeita — orçamentos que já usam este módulo não são afetados (o item fica
          congelado no orçamento), mas ele deixa de aparecer como opção para novos itens.
        </p>
        {erro && (
          <Alert variant="erro">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setAberto(false)} disabled={executando}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmar} disabled={executando}>
            {executando ? "Excluindo…" : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
