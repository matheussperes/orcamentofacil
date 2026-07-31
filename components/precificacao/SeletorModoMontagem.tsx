"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatarMoeda } from "@/lib/format";
import type { ModoMontagem } from "@/lib/engine/precificacao";
import { fracaoParaPercent, percentParaFracao } from "./formatoPercentual";

// Task 13.7a (contrato .maestro/tmp/13.7a-contract.md) — extraído de
// `components/orcamento/FinanceiroLab.tsx` (Task 13.5), mesmo espírito e
// mesma extração de `SeletorModoPrecificacao.tsx` (ver comentário lá — não
// repetido aqui). `/perfil` reaproveita este módulo para editar
// `organizacao.modo_montagem_padrao`.
export interface SeletorModoMontagemProps {
  valor: ModoMontagem;
  onChange: (valor: ModoMontagem) => void;
  /** Ver `SeletorModoPrecificacao.tsx`. */
  idPrefix?: string;
}

export function rotuloModoMontagem(modo: ModoMontagem): string {
  switch (modo.modo) {
    case "percentual_material":
      return `${fracaoParaPercent(modo.percentual)}% do material`;
    case "por_chapa":
      return `${formatarMoeda(modo.valorChapa)}/chapa`;
    case "manual":
      return formatarMoeda(modo.valor);
  }
}

function novoModoMontagem(modo: string, atual: ModoMontagem): ModoMontagem {
  switch (modo) {
    case "percentual_material":
      return { modo: "percentual_material", percentual: 0.1 };
    case "por_chapa":
      return { modo: "por_chapa", valorChapa: 30 };
    case "manual":
      return { modo: "manual", valor: 200 };
    default:
      return atual;
  }
}

function CampoNumerico({
  idPrefix,
  valor,
  onChange,
}: {
  idPrefix: string;
  valor: ModoMontagem;
  onChange: (v: ModoMontagem) => void;
}) {
  if (valor.modo === "percentual_material") {
    return (
      <div className="w-32">
        <Label htmlFor={`${idPrefix}-percentual`}>Percentual (%)</Label>
        <Input
          id={`${idPrefix}-percentual`}
          type="number"
          step="1"
          min={0}
          value={fracaoParaPercent(valor.percentual)}
          onChange={(e) =>
            onChange({ modo: "percentual_material", percentual: percentParaFracao(Number(e.target.value) || 0) })
          }
        />
      </div>
    );
  }
  if (valor.modo === "por_chapa") {
    return (
      <div className="w-32">
        <Label htmlFor={`${idPrefix}-valor-chapa`}>Valor/chapa (R$)</Label>
        <Input
          id={`${idPrefix}-valor-chapa`}
          type="number"
          step="0.01"
          min={0}
          value={valor.valorChapa}
          onChange={(e) => onChange({ modo: "por_chapa", valorChapa: Number(e.target.value) || 0 })}
        />
      </div>
    );
  }
  return (
    <div className="w-32">
      <Label htmlFor={`${idPrefix}-valor-manual`}>Valor (R$)</Label>
      <Input
        id={`${idPrefix}-valor-manual`}
        type="number"
        step="0.01"
        min={0}
        value={valor.valor}
        onChange={(e) => onChange({ modo: "manual", valor: Number(e.target.value) || 0 })}
      />
    </div>
  );
}

export function SeletorModoMontagem({ valor, onChange, idPrefix = "montagem" }: SeletorModoMontagemProps) {
  return (
    <div className="flex flex-wrap items-end gap-sm">
      <div>
        <Label htmlFor={`${idPrefix}-modo`}>Modo</Label>
        <Select value={valor.modo} onValueChange={(v) => onChange(novoModoMontagem(v, valor))}>
          <SelectTrigger id={`${idPrefix}-modo`} className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentual_material">Percentual sobre material</SelectItem>
            <SelectItem value="por_chapa">Valor por chapa</SelectItem>
            <SelectItem value="manual">Valor manual</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <CampoNumerico idPrefix={idPrefix} valor={valor} onChange={onChange} />
    </div>
  );
}
