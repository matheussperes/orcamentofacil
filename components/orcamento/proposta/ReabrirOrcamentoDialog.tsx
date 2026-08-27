"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Task R.5a — extraído de `PropostaLab.tsx` (decomposição pura, teto de
 * 400 linhas/arquivo). Diálogo de confirmação de "Reabrir orçamento"
 * (Task 1.9-front, só `admin`). */
export function ReabrirOrcamentoDialog({
  aberto,
  onOpenChange,
  erro,
  reabrindo,
  onConfirmar,
}: {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  erro: string | null;
  reabrindo: boolean;
  onConfirmar: () => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reabrir orçamento?</DialogTitle>
        </DialogHeader>
        <p className="text-corpo-pequeno text-cinza-500">
          Os valores desta proposta voltam a ser recalculados a cada alteração até você congelar de
          novo. O valor atual congelado deixa de ser exibido.
        </p>
        {erro && (
          <Alert variant="erro">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={reabrindo}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirmar} disabled={reabrindo}>
            {reabrindo ? "Reabrindo…" : "Reabrir orçamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
