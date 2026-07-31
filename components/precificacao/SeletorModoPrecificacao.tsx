"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatarMoeda } from "@/lib/format";
import type { ModoPrecificacao } from "@/lib/engine/precificacao";
import { fracaoParaPercent, percentParaFracao } from "./formatoPercentual";

// Task 13.7a (contrato .maestro/tmp/13.7a-contract.md) — extraído de
// `components/orcamento/FinanceiroLab.tsx` (Task 13.5), que já tinha esse UI
// completo mas local ao arquivo (`CampoNumericoModoPrecificacao`/
// `novoModoPrecificacao`, sem exportar). Motivo da extração: `/perfil`
// (Task 13.7a) precisa do MESMO seletor de modo de precificação pra editar
// o padrão da organização — sem extrair, seria a 2ª implementação completa
// desse UI num único repo (mesmo princípio já aplicado a
// `resolverAlvoElemento`/`calcularEngineOrcamento`, ver comentário do
// contrato). `FinanceiroLab.tsx` foi atualizado para consumir este módulo
// em vez da cópia local.
//
// Escopo do componente (decisão do contrato, "o toggle 'usar padrão'
// continua sendo responsabilidade de quem usa o componente"): só o par
// Select-de-modo + campo numérico do modo escolhido. Quem usa decide se
// existe (ou não) um toggle "usar o padrão da organização" ao redor —
// `FinanceiroLab` mantém o dele (override por orçamento); `/perfil` não tem
// toggle nenhum, porque lá o valor editado É o próprio padrão da
// organização, não uma exceção a ele.
export interface SeletorModoPrecificacaoProps {
  valor: ModoPrecificacao;
  onChange: (valor: ModoPrecificacao) => void;
  /** Prefixo dos `id`/`htmlFor` gerados — evita colisão quando mais de uma
   * instância deste seletor existe na mesma árvore de DOM. Default mantém os
   * mesmos ids que `FinanceiroLab.tsx` já usava antes da extração. */
  idPrefix?: string;
}

export function rotuloModoPrecificacao(modo: ModoPrecificacao): string {
  switch (modo.modo) {
    case "multiplicador":
      return `× ${modo.fator}`;
    case "percentual":
      return `+${fracaoParaPercent(modo.percentual)}%`;
    case "por_chapa":
      return `${formatarMoeda(modo.valorChapa)}/chapa`;
    case "fixo":
      return formatarMoeda(modo.valor);
  }
}

function novoModoPrecificacao(modo: string, atual: ModoPrecificacao): ModoPrecificacao {
  switch (modo) {
    case "multiplicador":
      return { modo: "multiplicador", fator: 2 };
    case "percentual":
      return { modo: "percentual", percentual: 0.5 };
    case "por_chapa":
      return { modo: "por_chapa", valorChapa: 100 };
    case "fixo":
      return { modo: "fixo", valor: 1000 };
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
  valor: ModoPrecificacao;
  onChange: (v: ModoPrecificacao) => void;
}) {
  if (valor.modo === "multiplicador") {
    return (
      <div className="w-32">
        <Label htmlFor={`${idPrefix}-fator`}>Fator</Label>
        <Input
          id={`${idPrefix}-fator`}
          type="number"
          step="0.1"
          min={0}
          value={valor.fator}
          onChange={(e) => onChange({ modo: "multiplicador", fator: Number(e.target.value) || 0 })}
        />
      </div>
    );
  }
  if (valor.modo === "percentual") {
    return (
      <div className="w-32">
        <Label htmlFor={`${idPrefix}-percentual`}>Percentual (%)</Label>
        <Input
          id={`${idPrefix}-percentual`}
          type="number"
          step="1"
          min={0}
          value={fracaoParaPercent(valor.percentual)}
          onChange={(e) => onChange({ modo: "percentual", percentual: percentParaFracao(Number(e.target.value) || 0) })}
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
      <Label htmlFor={`${idPrefix}-valor-fixo`}>Valor fixo (R$)</Label>
      <Input
        id={`${idPrefix}-valor-fixo`}
        type="number"
        step="0.01"
        min={0}
        value={valor.valor}
        onChange={(e) => onChange({ modo: "fixo", valor: Number(e.target.value) || 0 })}
      />
    </div>
  );
}

export function SeletorModoPrecificacao({ valor, onChange, idPrefix = "precificacao" }: SeletorModoPrecificacaoProps) {
  return (
    <div className="flex flex-wrap items-end gap-sm">
      <div>
        <Label htmlFor={`${idPrefix}-modo`}>Modo</Label>
        <Select value={valor.modo} onValueChange={(v) => onChange(novoModoPrecificacao(v, valor))}>
          <SelectTrigger id={`${idPrefix}-modo`} className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="multiplicador">Multiplicador sobre material</SelectItem>
            <SelectItem value="percentual">Percentual sobre material</SelectItem>
            <SelectItem value="por_chapa">Valor por chapa</SelectItem>
            <SelectItem value="fixo">Valor fixo</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <CampoNumerico idPrefix={idPrefix} valor={valor} onChange={onChange} />
    </div>
  );
}
