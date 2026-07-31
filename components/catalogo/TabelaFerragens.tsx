"use client";

import { Pencil, Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormularioFerragemDialog } from "./FormularioFerragemDialog";
import { AlternarAtivoDialog } from "./AlternarAtivoDialog";
import { formatarMoeda } from "@/lib/format";
import { nomeAmigavelFerragem, type EspecificacaoFerragem, type ProdutoRow } from "@/lib/produto/tipos";
import type { DadosProduto, ResultadoProduto } from "@/lib/produto/acoes";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — tabela da seção
// "Ferragens" de `/catalogo`. Coluna "Código" mostra o código FIXO (não
// editável como texto livre — ver `FormularioFerragemDialog`), com o nome
// amigável ao lado para leitura rápida.
export interface TabelaFerragensProps {
  produtos: ProdutoRow[];
  onCriar: (dados: DadosProduto) => Promise<ResultadoProduto>;
  onAtualizar: (id: string, dados: DadosProduto) => Promise<ResultadoProduto>;
  onAlternarAtivo: (id: string, ativo: boolean) => Promise<ResultadoProduto>;
  onSucesso: (produto: ProdutoRow) => void;
}

export function TabelaFerragens({
  produtos,
  onCriar,
  onAtualizar,
  onAlternarAtivo,
  onSucesso,
}: TabelaFerragensProps) {
  return (
    <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
        <div>
          <h2 className="text-titulo-secao text-cinza-900">Ferragens</h2>
          <p className="text-corpo-pequeno text-cinza-500">
            Código fixo (usado pelo motor de cálculo), nome e preço por unidade.
          </p>
        </div>
        <FormularioFerragemDialog
          trigger={
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar ferragem
            </Button>
          }
          onSalvar={onCriar}
          onSucesso={onSucesso}
        />
      </div>

      {produtos.length === 0 ? (
        <div className="flex flex-col items-center gap-sm py-3xl text-center">
          <Wrench className="h-8 w-8 text-cinza-300" aria-hidden="true" />
          <h3 className="text-titulo-card text-cinza-700">Nenhuma ferragem cadastrada ainda</h3>
          <p className="max-w-sm text-corpo-pequeno text-cinza-500">
            Cadastre dobradiças, corrediças, puxadores e outras ferragens usadas nos orçamentos.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" aria-hidden="true" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((produto) => {
              const espec = produto.especificacao as Partial<EspecificacaoFerragem>;
              const codigo = espec.codigo ?? "";
              return (
                <TableRow key={produto.id} className={!produto.ativo ? "opacity-60" : undefined}>
                  <TableCell className="font-medium text-cinza-900">{produto.nome}</TableCell>
                  <TableCell className="text-cinza-500">
                    {codigo ? nomeAmigavelFerragem(codigo) : "—"}
                  </TableCell>
                  <TableCell>{espec.unidade ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatarMoeda(produto.preco)}</TableCell>
                  <TableCell>
                    <Badge variant={produto.ativo ? "sucesso-solido" : "neutro"}>
                      {produto.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <FormularioFerragemDialog
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
