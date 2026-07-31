"use client";

import { useState } from "react";
import { Power } from "lucide-react";
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

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — confirmação
// destrutiva de "Remover produto" (Design-System.md Seção 7.11: "Toda
// confirmação destrutiva... passa por este componente — nunca
// `window.confirm` nativo"). Reaproveitado pelas 3 tabelas de `/catalogo`
// (Chapas/Ferragens/Fita-LED-Acessórios) — texto e ação mudam com `ativo`
// (desativar × reativar), mesmo padrão de nomear o que será afetado (Seção
// 11: "nomeiam o que será perdido").
export interface AlternarAtivoDialogProps {
  nomeProduto: string;
  ativo: boolean;
  onConfirmar: () => Promise<{ ok: boolean; erro?: string }>;
}

export function AlternarAtivoDialog({ nomeProduto, ativo, onConfirmar }: AlternarAtivoDialogProps) {
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
      setErro(resultado.erro ?? "Não foi possível concluir esta ação.");
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
          variant={ativo ? "danger" : "ghost"}
          size="icon"
          aria-label={ativo ? `Desativar ${nomeProduto}` : `Reativar ${nomeProduto}`}
          title={ativo ? "Desativar produto" : "Reativar produto"}
        >
          <Power className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent tamanho="confirmacao">
        <DialogHeader>
          <DialogTitle>{ativo ? "Desativar produto?" : "Reativar produto?"}</DialogTitle>
        </DialogHeader>
        <p className="text-corpo-pequeno text-cinza-800">
          {ativo ? (
            <>
              Desativar &quot;{nomeProduto}&quot; remove este produto das opções disponíveis para
              novos orçamentos. O histórico de preço em orçamentos já feitos não é afetado. Você
              pode reativá-lo a qualquer momento.
            </>
          ) : (
            <>
              &quot;{nomeProduto}&quot; volta a aparecer nas opções disponíveis para novos
              orçamentos.
            </>
          )}
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
          <Button variant={ativo ? "danger" : "primary"} onClick={confirmar} disabled={executando}>
            {executando ? "Aguarde…" : ativo ? "Desativar" : "Reativar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
