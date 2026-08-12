"use client";

import { useState } from "react";
import { Package, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormularioProdutoDialog, ROTULO_CATEGORIA } from "./FormularioProdutoDialog";
import { AlternarAtivoDialog } from "./AlternarAtivoDialog";
import { formatarMoeda } from "@/lib/format";
import { nomeAmigavelFerragem, type EspecificacaoChapa, type EspecificacaoFerragem, type ProdutoRow, type TipoProduto } from "@/lib/produto/tipos";
import type { DadosProduto, ResultadoProduto } from "@/lib/produto/acoes";

// Task 4.1-4.3-4.5 (contrato .maestro/state/contracts/4.1-4.3-4.5.md) —
// substitui `TabelaChapas`/`TabelaFerragens`/`TabelaSimples` (3 tabelas
// separadas sob `Tabs` de categoria) por um único card com seletor de
// categoria INTERNO (RF-30, "Todos" continua opção válida) e botão genérico
// "Adicionar item" (nunca "Adicionar chapa"/"Adicionar ferragem").
export interface TabelaProdutosProps {
  produtos: ProdutoRow[];
  onCriar: (dados: DadosProduto) => Promise<ResultadoProduto>;
  onAtualizar: (id: string, dados: DadosProduto) => Promise<ResultadoProduto>;
  onAlternarAtivo: (id: string, ativo: boolean) => Promise<ResultadoProduto>;
  onSucesso: (produto: ProdutoRow) => void;
}

const FILTRO_TODOS = "todos";

/** Resumo do campo mais relevante de cada categoria (cor+espessura da
 * chapa, código fixo da ferragem, unidade da fita) — mesma informação que
 * as 3 tabelas antigas mostravam, agora numa coluna só. */
export function resumoEspecificacao(produto: ProdutoRow): string {
  if (produto.tipo === "chapa") {
    const espec = produto.especificacao as Partial<EspecificacaoChapa>;
    const partes = [espec.cor, espec.espessura ? `${espec.espessura}mm` : undefined].filter(Boolean);
    return partes.length ? partes.join(" · ") : "—";
  }
  if (produto.tipo === "ferragem") {
    const espec = produto.especificacao as Partial<EspecificacaoFerragem>;
    return espec.codigo ? nomeAmigavelFerragem(espec.codigo) : "—";
  }
  if (produto.tipo === "fita") return "m";
  return "—";
}

export function TabelaProdutos({ produtos, onCriar, onAtualizar, onAlternarAtivo, onSucesso }: TabelaProdutosProps) {
  const [filtro, setFiltro] = useState<typeof FILTRO_TODOS | TipoProduto>(FILTRO_TODOS);

  const produtosFiltrados = filtro === FILTRO_TODOS ? produtos : produtos.filter((p) => p.tipo === filtro);

  return (
    <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
        <div className="flex flex-wrap items-center gap-md">
          <div>
            <h2 className="text-titulo-secao text-cinza-900">Produtos</h2>
            <p className="text-corpo-pequeno text-cinza-500">Chapas, ferragens, fita, LEDs e acessórios do catálogo.</p>
          </div>
          <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
            <SelectTrigger className="w-48" aria-label="Filtrar por categoria">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTRO_TODOS}>Todos</SelectItem>
              {(Object.keys(ROTULO_CATEGORIA) as TipoProduto[]).map((tipo) => (
                <SelectItem key={tipo} value={tipo}>
                  {ROTULO_CATEGORIA[tipo]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FormularioProdutoDialog
          trigger={
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Adicionar item
            </Button>
          }
          onSalvar={onCriar}
          onSucesso={onSucesso}
        />
      </div>

      {produtosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center gap-sm py-3xl text-center">
          <Package className="h-8 w-8 text-cinza-300" aria-hidden="true" />
          <h3 className="text-titulo-card text-cinza-700">Nenhum produto cadastrado ainda</h3>
          <p className="max-w-sm text-corpo-pequeno text-cinza-500">
            Cadastre os produtos que sua marcenaria usa para incluí-los nos orçamentos.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Detalhes</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20" aria-hidden="true" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtosFiltrados.map((produto) => (
              <TableRow key={produto.id} className={!produto.ativo ? "opacity-60" : undefined}>
                <TableCell className="font-medium text-cinza-900">{produto.nome}</TableCell>
                <TableCell>{ROTULO_CATEGORIA[produto.tipo]}</TableCell>
                <TableCell className="text-cinza-500">{produto.codigo ?? "—"}</TableCell>
                <TableCell className="text-cinza-500">{resumoEspecificacao(produto)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatarMoeda(produto.preco)}</TableCell>
                <TableCell>
                  <Badge variant={produto.ativo ? "sucesso-solido" : "neutro"}>
                    {produto.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <FormularioProdutoDialog
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
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
