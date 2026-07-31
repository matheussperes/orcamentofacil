"use client";

import type { ComponentType } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormularioSimplesDialog } from "./FormularioSimplesDialog";
import { AlternarAtivoDialog } from "./AlternarAtivoDialog";
import { formatarMoeda } from "@/lib/format";
import type { DadosProduto, ResultadoProduto } from "@/lib/produto/acoes";
import type { ProdutoRow, TipoProduto } from "@/lib/produto/tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — tabela reaproveitada
// pelos 3 tipos "simples" (fita/LED/acessório), mesmo espírito de
// `FormularioSimplesDialog`: só nome + preço, sem código nem cor/espessura.
export interface TabelaSimplesProps {
  tipo: Extract<TipoProduto, "fita" | "led" | "acessorio">;
  titulo: string;
  descricao: string;
  Icone: ComponentType<{ className?: string }>;
  /** Unidade do preço (ex.: "m" para fita) — `null` quando o tipo não tem
   * unidade fixa (LED/acessório, avulso). */
  unidade: string | null;
  produtos: ProdutoRow[];
  onCriar: (dados: DadosProduto) => Promise<ResultadoProduto>;
  onAtualizar: (id: string, dados: DadosProduto) => Promise<ResultadoProduto>;
  onAlternarAtivo: (id: string, ativo: boolean) => Promise<ResultadoProduto>;
  onSucesso: (produto: ProdutoRow) => void;
}

export function TabelaSimples({
  tipo,
  titulo,
  descricao,
  Icone,
  unidade,
  produtos,
  onCriar,
  onAtualizar,
  onAlternarAtivo,
  onSucesso,
}: TabelaSimplesProps) {
  return (
    <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
        <div>
          <h2 className="text-titulo-secao text-cinza-900">{titulo}</h2>
          <p className="text-corpo-pequeno text-cinza-500">{descricao}</p>
        </div>
        <FormularioSimplesDialog
          trigger={
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar
            </Button>
          }
          tipo={tipo}
          rotuloTipo={titulo}
          unidade={unidade}
          onSalvar={onCriar}
          onSucesso={onSucesso}
        />
      </div>

      {produtos.length === 0 ? (
        <div className="flex flex-col items-center gap-sm py-3xl text-center">
          <Icone className="h-8 w-8 text-cinza-300" aria-hidden="true" />
          <h3 className="text-titulo-card text-cinza-700">Nenhum item cadastrado ainda</h3>
          <p className="max-w-sm text-corpo-pequeno text-cinza-500">
            Cadastre aqui os itens de {titulo.toLowerCase()} usados nos seus orçamentos.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Preço{unidade ? ` (${unidade})` : ""}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" aria-hidden="true" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((produto) => (
              <TableRow key={produto.id} className={!produto.ativo ? "opacity-60" : undefined}>
                <TableCell className="font-medium text-cinza-900">{produto.nome}</TableCell>
                <TableCell className="text-right tabular-nums">{formatarMoeda(produto.preco)}</TableCell>
                <TableCell>
                  <Badge variant={produto.ativo ? "sucesso-solido" : "neutro"}>
                    {produto.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <FormularioSimplesDialog
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Editar ${produto.nome}`}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      }
                      tipo={tipo}
                      rotuloTipo={titulo}
                      unidade={unidade}
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
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
