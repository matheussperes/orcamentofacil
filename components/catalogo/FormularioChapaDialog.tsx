"use client";

import { useState, type ReactNode } from "react";
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
import { SeletorTexturaChapa } from "@/components/catalogo/SeletorTexturaChapa";
import type { DadosProduto, ResultadoProduto } from "@/lib/produto/acoes";
import type { EspecificacaoChapa } from "@/lib/produto/tipos";
import type { ProdutoRow } from "@/lib/produto/tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — formulário de
// adicionar/editar produto tipo "chapa": nome, cor, espessura, preço (CRUD
// livre, contrato). `especificacao = { cor, espessura }` — shape exato da
// migration de seed (`supabase/migrations/20260727140000_seed_produtos_padrao.sql`).
export interface FormularioChapaDialogProps {
  trigger: ReactNode;
  produtoEmEdicao?: ProdutoRow;
  onSalvar: (dados: DadosProduto) => Promise<ResultadoProduto>;
  onSucesso: (produto: ProdutoRow) => void;
}

export function FormularioChapaDialog({
  trigger,
  produtoEmEdicao,
  onSalvar,
  onSucesso,
}: FormularioChapaDialogProps) {
  const especEmEdicao = produtoEmEdicao?.especificacao as Partial<EspecificacaoChapa> | undefined;

  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(produtoEmEdicao?.nome ?? "");
  const [cor, setCor] = useState(especEmEdicao?.cor ?? "");
  const [espessura, setEspessura] = useState(especEmEdicao?.espessura ?? 15);
  const [preco, setPreco] = useState(produtoEmEdicao?.preco ?? 0);
  const [texturaUrl, setTexturaUrl] = useState<string | undefined>(especEmEdicao?.texturaUrl);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function resetar() {
    setNome(produtoEmEdicao?.nome ?? "");
    setCor(especEmEdicao?.cor ?? "");
    setEspessura(especEmEdicao?.espessura ?? 15);
    setPreco(produtoEmEdicao?.preco ?? 0);
    setTexturaUrl(especEmEdicao?.texturaUrl);
    setErro(null);
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const resultado = await onSalvar({
      tipo: "chapa",
      nome,
      especificacao: { cor, espessura, texturaUrl },
      preco,
    });
    setSalvando(false);
    if (resultado.ok && resultado.produto) {
      onSucesso(resultado.produto);
      setAberto(false);
    } else {
      setErro(resultado.erro ?? "Não foi possível salvar a chapa.");
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent tamanho="formulario">
        <DialogHeader>
          <DialogTitle>{produtoEmEdicao ? "Editar chapa" : "Adicionar chapa"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          <div>
            <Label htmlFor="chapa-nome">Nome *</Label>
            <Input
              id="chapa-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Branco TX 15mm"
            />
          </div>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Label htmlFor="chapa-cor">Cor *</Label>
              <Input
                id="chapa-cor"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                placeholder="Ex.: Branco TX"
              />
            </div>
            <div>
              <Label htmlFor="chapa-espessura">Espessura (mm) *</Label>
              <Input
                id="chapa-espessura"
                type="number"
                min={1}
                value={espessura}
                onChange={(e) => setEspessura(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="w-40">
            <Label htmlFor="chapa-preco">Preço da chapa (R$) *</Label>
            <Input
              id="chapa-preco"
              type="number"
              min={0}
              step="0.01"
              value={preco}
              onChange={(e) => setPreco(Number(e.target.value) || 0)}
            />
          </div>
          <SeletorTexturaChapa value={texturaUrl} onChange={setTexturaUrl} />
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
            {salvando ? "Salvando…" : "Salvar chapa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
