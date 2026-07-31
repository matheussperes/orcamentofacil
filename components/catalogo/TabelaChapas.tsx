"use client";

import { Layers, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormularioChapaDialog } from "./FormularioChapaDialog";
import { AlternarAtivoDialog } from "./AlternarAtivoDialog";
import { formatarMoeda } from "@/lib/format";
import type { DadosProduto, ResultadoProduto } from "@/lib/produto/acoes";
import type { EspecificacaoChapa, ProdutoRow } from "@/lib/produto/tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — tabela da seção
// "Chapas" de `/catalogo` (Design-System.md Seção 7.7). Estado VAZIO (Seção
// 8) quando a organização não tem nenhuma chapa cadastrada ainda.
export interface TabelaChapasProps {
  produtos: ProdutoRow[];
  onCriar: (dados: DadosProduto) => Promise<ResultadoProduto>;
  onAtualizar: (id: string, dados: DadosProduto) => Promise<ResultadoProduto>;
  onAlternarAtivo: (id: string, ativo: boolean) => Promise<ResultadoProduto>;
  onSucesso: (produto: ProdutoRow) => void;
}

export function TabelaChapas({ produtos, onCriar, onAtualizar, onAlternarAtivo, onSucesso }: TabelaChapasProps) {
  return (
    <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
        <div>
          <h2 className="text-titulo-secao text-cinza-900">Chapas</h2>
          <p className="text-corpo-pequeno text-cinza-500">Cor, espessura e preço por chapa comercial.</p>
        </div>
        <FormularioChapaDialog
          trigger={
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar chapa
            </Button>
          }
          onSalvar={onCriar}
          onSucesso={onSucesso}
        />
      </div>

      {produtos.length === 0 ? (
        <div className="flex flex-col items-center gap-sm py-3xl text-center">
          <Layers className="h-8 w-8 text-cinza-300" aria-hidden="true" />
          <h3 className="text-titulo-card text-cinza-700">Nenhuma chapa cadastrada ainda</h3>
          <p className="max-w-sm text-corpo-pequeno text-cinza-500">
            Cadastre as chapas de MDF que sua marcenaria compra para usá-las nos orçamentos.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Espessura</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" aria-hidden="true" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((produto) => {
              const espec = produto.especificacao as Partial<EspecificacaoChapa>;
              return (
                <TableRow key={produto.id} className={!produto.ativo ? "opacity-60" : undefined}>
                  <TableCell className="font-medium text-cinza-900">{produto.nome}</TableCell>
                  <TableCell>{espec.cor ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">
                    {espec.espessura ? `${espec.espessura}mm` : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatarMoeda(produto.preco)}</TableCell>
                  <TableCell>
                    <Badge variant={produto.ativo ? "sucesso-solido" : "neutro"}>
                      {produto.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <FormularioChapaDialog
                        trigger={
                          <Button variant="ghost" size="icon" aria-label={`Editar ${produto.nome}`}>
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        }
                        produtoEmEdicao={produto}
                        onSalvar={(dados) => onAtualizar(produto.id, dados)}
                        onSucesso={onSucesso}
                      />
                      <AlternarAtivoDialog
                        nomeProduto={produto.nome}
                        ativo={produto.ativo}
                        onConfirmar={async () => {
                          const resultado = await onAlternarAtivo(produto.id, !produto.ativo);
                          if (resultado.ok && resultado.produto) onSucesso(resultado.produto);
                          return resultado;
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
