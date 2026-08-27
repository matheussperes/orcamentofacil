// Task R.3c — decomposição pura de `EditorItemNucleo.tsx`: cards "Custo ao
// vivo" e "Peças (lista técnica)", extraídos sem nenhuma mudança de
// comportamento ou de aparência.

import type { Peca } from "@/lib/engine/types";
import type { montarLinhasInsumos } from "@/lib/insumos";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { brl } from "./EditorItemNucleoHelpers";

export interface EditorItemNucleoCustoPanelProps {
  precoComDesconto: number;
  custoDireto: number;
  insumos: ReturnType<typeof montarLinhasInsumos> | null;
}

export function EditorItemNucleoCustoPanel({ precoComDesconto, custoDireto, insumos }: EditorItemNucleoCustoPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custo ao vivo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-sm">
          <div className="rounded-lg border border-accent-border bg-accent-subtle p-3">
            <div className="text-legenda text-cinza-500">Preço final</div>
            <div className="text-valor-destaque text-accent tabular-nums">{brl(precoComDesconto)}</div>
          </div>
          <div className="rounded-lg border border-cinza-200 bg-cinza-0 p-3">
            <div className="text-legenda text-cinza-500">Custo direto</div>
            <div className="text-valor-destaque text-cinza-900 tabular-nums">{brl(custoDireto)}</div>
          </div>
        </div>
        {insumos && (
          <div className="mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insumos.linhas.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>{l.item}</TableCell>
                    <TableCell>{l.qtd}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(l.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export interface EditorItemNucleoPecasPanelProps {
  pecas: Peca[];
}

export function EditorItemNucleoPecasPanel({ pecas }: EditorItemNucleoPecasPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Peças (lista técnica)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Peça</TableHead>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Dimensões (mm)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pecas.map((p, i) => (
              <TableRow key={i}>
                <TableCell>{p.nome}</TableCell>
                <TableCell className="text-cinza-500">
                  {p.cor} {p.espessura_mm}mm
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.quantidade}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.largura_mm}×{p.altura_mm}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
