"use client";

import { Check, Download, Pencil, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TituloSecao } from "@/components/ui/titulo-secao";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatarMoeda } from "@/lib/format";
import type { ItemManualListaMaterial } from "@/lib/lista-material/tipos";
import type { LinhaInsumo } from "@/lib/insumos";

/** Task R.5a — extraído de `CorteMaterialLab.tsx` (decomposição pura, teto
 * de 400 linhas/arquivo) — seção "Lista de material / pré-pedido" (tabela +
 * edição inline de quantidade + itens manuais + exportação). Toda mutação
 * é injetada via prop — este componente não guarda estado próprio. */
export function SecaoListaMaterial({
  linhasComOverride,
  overrides,
  editandoItem,
  valorEdicao,
  setValorEdicao,
  erroEdicaoQuantidade,
  congeladoEm,
  iniciarEdicaoQuantidade,
  cancelarEdicaoQuantidade,
  confirmarEdicaoQuantidade,
  reverterEdicaoQuantidade,
  itensManuais,
  removerItemManual,
  subtotal,
  subtotalManual,
  totalGeral,
  frete,
  formDescricao,
  setFormDescricao,
  formQuantidade,
  setFormQuantidade,
  formValorUnitario,
  setFormValorUnitario,
  adicionarItemManual,
  handleExportarTxt,
  handleExportarCsv,
}: {
  linhasComOverride: LinhaInsumo[];
  overrides: Map<string, number>;
  editandoItem: string | null;
  valorEdicao: number;
  setValorEdicao: (v: number) => void;
  erroEdicaoQuantidade: string | null;
  congeladoEm: string | null;
  iniciarEdicaoQuantidade: (linha: LinhaInsumo) => void;
  cancelarEdicaoQuantidade: () => void;
  confirmarEdicaoQuantidade: (itemChave: string) => void;
  reverterEdicaoQuantidade: (itemChave: string) => void;
  itensManuais: ItemManualListaMaterial[];
  removerItemManual: (id: string) => void;
  subtotal: number;
  subtotalManual: number;
  totalGeral: number;
  frete: number | null;
  formDescricao: string;
  setFormDescricao: (v: string) => void;
  formQuantidade: number;
  setFormQuantidade: (v: number) => void;
  formValorUnitario: number;
  setFormValorUnitario: (v: number) => void;
  adicionarItemManual: () => void;
  handleExportarTxt: () => void;
  handleExportarCsv: () => void;
}) {
  return (
    <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      <TituloSecao
        action={
          <div className="flex gap-sm">
            <Button variant="ghost" size="sm" onClick={handleExportarTxt}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Baixar TXT
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExportarCsv}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Baixar CSV
            </Button>
          </div>
        }
      >
        Lista de material / pré-pedido
      </TituloSecao>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead className="text-right">Valor unitário</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-8" aria-hidden="true" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhasComOverride.map((linha, i) => {
            const editando = editandoItem === linha.item;
            const temOverride = overrides.has(linha.item);
            return (
              <TableRow key={`bom-${i}`}>
                <TableCell>{linha.item}</TableCell>
                <TableCell className="text-cinza-500">{linha.categoria}</TableCell>
                <TableCell>
                  {editando ? (
                    <div className="flex items-center gap-xs">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={valorEdicao}
                        onChange={(e) => setValorEdicao(Number(e.target.value) || 0)}
                        className="h-8 w-24"
                        aria-label={`Nova quantidade de ${linha.item}`}
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmarEdicaoQuantidade(linha.item)}
                        aria-label={`Confirmar quantidade de ${linha.item}`}
                      >
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={cancelarEdicaoQuantidade}
                        aria-label="Cancelar edição de quantidade"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-xs">
                      {temOverride ? (
                        <>
                          <span className="tabular-nums">{overrides.get(linha.item)}</span>
                          <Badge variant="enviado">Editado</Badge>
                        </>
                      ) : (
                        <span>{linha.qtd}</span>
                      )}
                      {congeladoEm === null && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => iniciarEdicaoQuantidade(linha)}
                            aria-label={`Editar quantidade de ${linha.item}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                          {temOverride && (
                            <Button variant="ghost" size="sm" onClick={() => reverterEdicaoQuantidade(linha.item)}>
                              Reverter
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatarMoeda(linha.unit)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatarMoeda(linha.total)}</TableCell>
                <TableCell />
              </TableRow>
            );
          })}
          {itensManuais.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.descricao}</TableCell>
              <TableCell className="text-cinza-500">Serviço</TableCell>
              <TableCell>{item.quantidade}</TableCell>
              <TableCell className="text-right tabular-nums">{formatarMoeda(item.valorUnitario)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatarMoeda(item.quantidade * item.valorUnitario)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removerItemManual(item.id)}
                  aria-label={`Remover ${item.descricao}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 border-cinza-300 bg-cinza-50 font-bold hover:bg-cinza-50">
            <TableCell colSpan={4}>Subtotal material</TableCell>
            <TableCell className="text-right tabular-nums">{formatarMoeda(subtotal)}</TableCell>
            <TableCell />
          </TableRow>
          <TableRow className="bg-cinza-50 font-bold hover:bg-cinza-50">
            <TableCell colSpan={4}>Subtotal itens manuais</TableCell>
            <TableCell className="text-right tabular-nums">{formatarMoeda(subtotalManual)}</TableCell>
            <TableCell />
          </TableRow>
          <TableRow className="bg-cinza-50 font-bold hover:bg-cinza-50">
            <TableCell colSpan={4} className="text-titulo-card">
              Total do pré-pedido
            </TableCell>
            <TableCell className="text-right text-valor-destaque tabular-nums">{formatarMoeda(totalGeral)}</TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>

      {erroEdicaoQuantidade && (
        <Alert variant="erro" className="mt-sm">
          <AlertDescription>{erroEdicaoQuantidade}</AlertDescription>
        </Alert>
      )}

      <p className="mt-sm text-corpo-pequeno text-cinza-500">
        Frete:{" "}
        {frete !== null ? (
          <span className="tabular-nums text-cinza-800">{formatarMoeda(frete)}</span>
        ) : (
          "não informado"
        )}{" "}
        — informativo; o valor final de frete e montagem é definido na aba Financeiro.
      </p>

      <div className="mt-lg flex flex-wrap items-end gap-sm border-t border-cinza-200 pt-md">
        <div className="flex-1 basis-48">
          <Label htmlFor="item-manual-descricao">Descrição</Label>
          <Input
            id="item-manual-descricao"
            value={formDescricao}
            onChange={(e) => setFormDescricao(e.target.value)}
            placeholder="Ex.: Instalação de nicho especial"
          />
        </div>
        <div className="w-24">
          <Label htmlFor="item-manual-qtd">Quantidade</Label>
          <Input
            id="item-manual-qtd"
            type="number"
            min={1}
            value={formQuantidade}
            onChange={(e) => setFormQuantidade(Number(e.target.value) || 0)}
          />
        </div>
        <div className="w-32">
          <Label htmlFor="item-manual-valor">Valor unitário</Label>
          <Input
            id="item-manual-valor"
            type="number"
            min={0}
            step="0.01"
            value={formValorUnitario}
            onChange={(e) => setFormValorUnitario(Number(e.target.value) || 0)}
          />
        </div>
        <Button variant="outline" onClick={adicionarItemManual}>
          Adicionar item
        </Button>
      </div>
    </section>
  );
}
