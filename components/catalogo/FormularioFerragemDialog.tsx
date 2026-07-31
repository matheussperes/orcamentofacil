"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { DadosProduto, ResultadoProduto } from "@/lib/produto/acoes";
import {
  CODIGOS_FERRAGEM_FIXOS,
  nomeAmigavelFerragem,
  unidadePadraoFerragem,
  type EspecificacaoFerragem,
  type ProdutoRow,
} from "@/lib/produto/tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — formulário de
// adicionar/editar produto tipo "ferragem". Diferença central pro formulário
// de chapa: `codigo` é um SELETOR com os códigos fixos que o motor de caixa
// emite (`CODIGOS_FERRAGEM_FIXOS`), nunca texto livre — um `codigo` fora
// dessa lista vira produto "morto", sem efeito em nenhum cálculo (contrato,
// critério de aceitação). Nome/preço continuam livres.
//
// Decisão de escopo (contrato: "nome pode ser auto-preenchido a partir de
// NOMES_FERRAGENS[codigo] ou editável, sua escolha"): auto-preenche o nome
// ao trocar o código SÓ quando o campo nome ainda está vazio ou ainda é
// igual ao nome amigável do código anterior — preserva um nome customizado
// que o usuário já tenha digitado, sem sobrescrevê-lo às escondidas se ele
// trocar o código depois.
export interface FormularioFerragemDialogProps {
  trigger: ReactNode;
  produtoEmEdicao?: ProdutoRow;
  onSalvar: (dados: DadosProduto) => Promise<ResultadoProduto>;
  onSucesso: (produto: ProdutoRow) => void;
}

export function FormularioFerragemDialog({
  trigger,
  produtoEmEdicao,
  onSalvar,
  onSucesso,
}: FormularioFerragemDialogProps) {
  const especEmEdicao = produtoEmEdicao?.especificacao as Partial<EspecificacaoFerragem> | undefined;
  const codigoInicial = especEmEdicao?.codigo ?? CODIGOS_FERRAGEM_FIXOS[0] ?? "";

  const [aberto, setAberto] = useState(false);
  const [codigo, setCodigo] = useState(codigoInicial);
  const [nome, setNome] = useState(produtoEmEdicao?.nome ?? nomeAmigavelFerragem(codigoInicial));
  const [preco, setPreco] = useState(produtoEmEdicao?.preco ?? 0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function resetar() {
    setCodigo(codigoInicial);
    setNome(produtoEmEdicao?.nome ?? nomeAmigavelFerragem(codigoInicial));
    setPreco(produtoEmEdicao?.preco ?? 0);
    setErro(null);
  }

  function trocarCodigo(novoCodigo: string) {
    const nomeAtualEhAutomatico = nome.trim() === "" || nome === nomeAmigavelFerragem(codigo);
    setCodigo(novoCodigo);
    if (nomeAtualEhAutomatico) {
      setNome(nomeAmigavelFerragem(novoCodigo));
    }
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const resultado = await onSalvar({
      tipo: "ferragem",
      nome,
      especificacao: { codigo, unidade: unidadePadraoFerragem(codigo) },
      preco,
    });
    setSalvando(false);
    if (resultado.ok && resultado.produto) {
      onSucesso(resultado.produto);
      setAberto(false);
    } else {
      setErro(resultado.erro ?? "Não foi possível salvar a ferragem.");
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
          <DialogTitle>{produtoEmEdicao ? "Editar ferragem" : "Adicionar ferragem"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          <div>
            <Label htmlFor="ferragem-codigo">Código *</Label>
            <Select value={codigo} onValueChange={trocarCodigo}>
              <SelectTrigger id="ferragem-codigo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CODIGOS_FERRAGEM_FIXOS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {nomeAmigavelFerragem(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-corpo-pequeno text-cinza-500">
              Fixo — precisa bater com o item que o motor de cálculo gera.
            </p>
          </div>
          <div>
            <Label htmlFor="ferragem-nome">Nome *</Label>
            <Input id="ferragem-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="w-40">
            <Label htmlFor="ferragem-preco">
              Preço ({unidadePadraoFerragem(codigo)}) *
            </Label>
            <Input
              id="ferragem-preco"
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
            {salvando ? "Salvando…" : "Salvar ferragem"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
