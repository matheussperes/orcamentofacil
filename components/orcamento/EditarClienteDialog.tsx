"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { atualizarCliente } from "@/lib/cliente/acoes";

// Task 0.5b (RF-32) — diálogo de edição de nome/telefone/endereço do
// cliente a partir de `/orcamento/[id]` (Design-System.md §7.9/§7.11).
// Mesmo padrão de `components/catalogo/FormularioChapaDialog.tsx`: `Dialog`
// controlado, formulário local, chama a Server Action direto (sem passar
// por prop `onSalvar` genérica — só este componente edita cliente) e avisa
// o pai via `onSalvo` para atualizar a exibição sem F5.
export interface EditarClienteDialogProps {
  clienteId: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  onSalvo: (dados: { nome: string; telefone: string | null; endereco: string | null }) => void;
}

export function EditarClienteDialog({
  clienteId,
  nome,
  telefone,
  endereco,
  onSalvo,
}: EditarClienteDialogProps) {
  const [aberto, setAberto] = useState(false);
  const [nomeCampo, setNomeCampo] = useState(nome);
  const [telefoneCampo, setTelefoneCampo] = useState(telefone ?? "");
  const [enderecoCampo, setEnderecoCampo] = useState(endereco ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function resetar() {
    setNomeCampo(nome);
    setTelefoneCampo(telefone ?? "");
    setEnderecoCampo(endereco ?? "");
    setErro(null);
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const resultado = await atualizarCliente({
      clienteId,
      nome: nomeCampo,
      telefone: telefoneCampo,
      endereco: enderecoCampo,
    });
    setSalvando(false);
    if (resultado.ok) {
      onSalvo({
        nome: nomeCampo.trim(),
        telefone: telefoneCampo.trim() || null,
        endereco: enderecoCampo.trim() || null,
      });
      setAberto(false);
    } else {
      setErro(resultado.erro ?? "Não foi possível salvar o cliente.");
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (v) resetar();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Editar dados de ${nome}`}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent tamanho="formulario">
        <DialogHeader>
          <DialogTitle>Editar cliente</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          <div>
            <Label htmlFor="cliente-nome">Nome *</Label>
            <Input
              id="cliente-nome"
              value={nomeCampo}
              onChange={(e) => setNomeCampo(e.target.value)}
              placeholder="Ex.: Maria Silva"
            />
          </div>
          <div>
            <Label htmlFor="cliente-telefone">Telefone</Label>
            <Input
              id="cliente-telefone"
              value={telefoneCampo}
              onChange={(e) => setTelefoneCampo(e.target.value)}
              placeholder="Ex.: (11) 99999-9999"
            />
          </div>
          <div>
            <Label htmlFor="cliente-endereco">Endereço</Label>
            <Input
              id="cliente-endereco"
              value={enderecoCampo}
              onChange={(e) => setEnderecoCampo(e.target.value)}
              placeholder="Ex.: Rua das Flores, 123"
            />
          </div>
        </div>

        {erro && (
          <Alert variant="erro">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setAberto(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
