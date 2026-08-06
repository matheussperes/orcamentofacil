"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Task 2.3-2.6 — confirmação destrutiva de "Excluir ambiente"/"Excluir
// parede" (Design-System Seção 7.11: "toda confirmação destrutiva... excluir
// ambiente... passa por este componente — nunca `window.confirm` nativo"),
// mesmo padrão de `components/biblioteca/ExcluirGabaritoDialog.tsx`.
// Compartilhado pelos dois níveis (ambiente/parede) — só rótulo/mensagem
// mudam por prop, evitando duplicar o mesmo Dialog duas vezes.
export interface ExcluirAmbienteParedeDialogProps {
  rotulo: "ambiente" | "parede";
  nome: string;
  mensagem: string;
  onConfirmar: () => void | Promise<void>;
  disabled?: boolean;
}

export function ExcluirAmbienteParedeDialog({
  rotulo,
  nome,
  mensagem,
  onConfirmar,
  disabled,
}: ExcluirAmbienteParedeDialogProps) {
  const [aberto, setAberto] = useState(false);
  const [executando, setExecutando] = useState(false);

  async function confirmar() {
    setExecutando(true);
    await onConfirmar();
    setExecutando(false);
    setAberto(false);
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          aria-label={`Excluir ${rotulo} ${nome}`}
          title={disabled ? `Não é possível excluir o único ${rotulo}` : `Excluir ${rotulo}`}
        >
          <Trash2 size={14} />
        </Button>
      </DialogTrigger>
      <DialogContent tamanho="confirmacao">
        <DialogHeader>
          <DialogTitle>Excluir {rotulo}?</DialogTitle>
        </DialogHeader>
        <p className="text-corpo-pequeno text-cinza-800">{mensagem}</p>
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
