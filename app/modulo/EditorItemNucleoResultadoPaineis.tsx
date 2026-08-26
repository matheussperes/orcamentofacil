// Task R.3c — decomposição pura de `EditorItemNucleo.tsx`: cards "Custo ao
// vivo" e "Peças (lista técnica)", extraídos sem nenhuma mudança de
// comportamento ou de aparência.

import type { Peca } from "@/lib/engine/types";
import type { montarLinhasInsumos } from "@/lib/insumos";
import { brl } from "./EditorItemNucleoHelpers";

export interface EditorItemNucleoCustoPanelProps {
  precoComDesconto: number;
  custoDireto: number;
  insumos: ReturnType<typeof montarLinhasInsumos> | null;
}

export function EditorItemNucleoCustoPanel({ precoComDesconto, custoDireto, insumos }: EditorItemNucleoCustoPanelProps) {
  return (
    <div className="card">
      <h2>Custo ao vivo</h2>
      <div className="grid grid-cols-2 gap-2">
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
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-cinza-200 bg-cinza-50">
                <th className="px-[10px] py-2 text-left text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                  Item
                </th>
                <th className="px-[10px] py-2 text-left text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                  Qtd
                </th>
                <th className="px-[10px] py-2 text-right text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {insumos.linhas.map((l, i) => (
                <tr key={i} className="border-b border-cinza-100 hover:bg-cinza-50">
                  <td className="px-[10px] py-2 text-corpo-pequeno">{l.item}</td>
                  <td className="px-[10px] py-2 text-corpo-pequeno">{l.qtd}</td>
                  <td className="px-[10px] py-2 text-right text-corpo-pequeno tabular-nums">{brl(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export interface EditorItemNucleoPecasPanelProps {
  pecas: Peca[];
}

export function EditorItemNucleoPecasPanel({ pecas }: EditorItemNucleoPecasPanelProps) {
  return (
    <div className="card">
      <h2>Peças (lista técnica)</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-cinza-200 bg-cinza-50">
              <th className="px-[10px] py-2 text-left text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                Peça
              </th>
              <th className="px-[10px] py-2 text-left text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                Material
              </th>
              <th className="px-[10px] py-2 text-right text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                Qtd
              </th>
              <th className="px-[10px] py-2 text-right text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">
                Dimensões (mm)
              </th>
            </tr>
          </thead>
          <tbody>
            {pecas.map((p, i) => (
              <tr key={i} className="border-b border-cinza-100 hover:bg-cinza-50">
                <td className="px-[10px] py-2 text-corpo-pequeno">{p.nome}</td>
                <td className="px-[10px] py-2 text-corpo-pequeno text-cinza-500">
                  {p.cor} {p.espessura_mm}mm
                </td>
                <td className="px-[10px] py-2 text-right text-corpo-pequeno tabular-nums">{p.quantidade}</td>
                <td className="px-[10px] py-2 text-right text-corpo-pequeno tabular-nums">
                  {p.largura_mm}×{p.altura_mm}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
