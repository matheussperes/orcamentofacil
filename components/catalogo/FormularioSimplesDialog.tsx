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
import type { DadosProduto, ResultadoProduto } from "@/lib/produto/acoes";
import type { ProdutoRow, TipoProduto } from "@/lib/produto/tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — formulário
// reaproveitado pelos 3 tipos "simples" (nome + preço, sem `codigo`
// obrigatório): "fita" (`especificacao = { unidade: "m" }`, contrato) e
// "led"/"acessorio" (nascem vazios, sem especificação obrigatória). Um único
// componente parametrizado por `tipo`/`rotuloTipo`/`unidade` em vez de 3
// arquivos quase idênticos — mesmo espírito de `SeletorModoPrecificacao`
// reaproveitado por Financeiro/Perfil.
export interface FormularioSimplesDialogProps {
  trigger: ReactNode;
  tipo: Extract<TipoProduto, "fita" | "led" | "acessorio">;
  rotuloTipo: string;
  /** Unidade mostrada ao lado do campo de preço (ex.: "m" para fita). `null`
   * quando o tipo não tem unidade própria (LED/acessório, contrato: "sem
   * `codigo` obrigatório" — e também sem unidade fixa, é un. avulsa). */
  unidade: string | null;
  produtoEmEdicao?: ProdutoRow;
  onSalvar: (dados: DadosProduto) => Promise<ResultadoProduto>;
  onSucesso: (produto: ProdutoRow) => void;
}

export function FormularioSimplesDialog({
  trigger,
  tipo,
  rotuloTipo,
  unidade,
  produtoEmEdicao,
  onSalvar,
  onSucesso,
}: FormularioSimplesDialogProps) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(produtoEmEdicao?.nome ?? "");
  const [preco, setPreco] = useState(produtoEmEdicao?.preco ?? 0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function resetar() {
    setNome(produtoEmEdicao?.nome ?? "");
    setPreco(produtoEmEdicao?.preco ?? 0);
    setErro(null);
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const resultado = await onSalvar({
      tipo,
      nome,
      especificacao: unidade ? { unidade } : {},
      preco,
    });
    setSalvando(false);
    if (resultado.ok && resultado.produto) {
      onSucesso(resultado.produto);
      setAberto(false);
    } else {
      setErro(resultado.erro ?? `Não foi possível salvar ${rotuloTipo.toLowerCase()}.`);
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
      <DialogContent tamanho="confirmacao">
        <DialogHeader>
          <DialogTitle>
            {produtoEmEdicao ? `Editar ${rotuloTipo.toLowerCase()}` : `Adicionar ${rotuloTipo.toLowerCase()}`}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          <div>
            <Label htmlFor={`simples-nome-${tipo}`}>Nome *</Label>
            <Input id={`simples-nome-${tipo}`} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="w-40">
            <Label htmlFor={`simples-preco-${tipo}`}>Preço{unidade ? ` (${unidade})` : ""} *</Label>
            <Input
              id={`simples-preco-${tipo}`}
              type="number"
              min={0}
              step="0.01"
              value={preco}
              onChange={(e) => setPreco(Number(e.target.value) || 0)}
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
            {salvando ? "Salvando…" : `Salvar ${rotuloTipo.toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
