"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { EtapaEsteira } from "@/lib/orcamento/etapa-esteira";
import { atualizarEtapaEsteira } from "@/lib/orcamento/atualizarEtapaEsteira";

// Task 5.10-front (Modelo-de-Dominio.md Seção 7.2, T2) — seletor manual de
// etapa da esteira em `/orcamento/[id]`. Mesmo padrão de
// `EditarClienteDialog.tsx`: Client Component chama a Server Action
// (`atualizarEtapaEsteira`, Task 5.10-back) diretamente, sem indireção via
// callback genérico — só este componente edita a etapa.
//
// T2: o seletor só oferece as 4 etapas NÃO-terminais — nunca `fechado`.
// Entrar em `fechado` só acontece pelo gatilho de aprovação (fora deste
// componente); sair só pela ação Reabrir (Task 1.9). Por isso, quando a
// etapa atual já é `fechado`, este componente não renderiza `<Select>`
// nenhum — só o badge "Fechado" read-only. Caminho hoje inalcançável na
// prática (nenhum gatilho leva a `fechado` neste lançamento — Seção 7.2 nota
// 2), mas implementado mesmo assim por ser defensivo e barato.
const ETAPAS_NAO_TERMINAIS: EtapaEsteira[] = ["novo", "visita_agendada", "projeto_3d", "aguardando_aprovacao"];

const ROTULO_ETAPA: Record<EtapaEsteira, string> = {
  novo: "Novo",
  visita_agendada: "Visita agendada",
  projeto_3d: "Projeto 3D",
  aguardando_aprovacao: "Aguardando aprovação",
  fechado: "Fechado",
};

export interface SeletorEtapaEsteiraProps {
  orcamentoId: string;
  etapaEsteiraInicial: EtapaEsteira;
  /** Avisa o pai da nova etapa em caso de sucesso — mesmo espírito de
   * `onSalvo` em `EditarClienteDialog`, para o badge ao lado refletir sem
   * F5. */
  onAtualizado: (novaEtapa: EtapaEsteira) => void;
}

export function SeletorEtapaEsteira({ orcamentoId, etapaEsteiraInicial, onAtualizado }: SeletorEtapaEsteiraProps) {
  const [etapa, setEtapa] = useState(etapaEsteiraInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (etapa === "fechado") {
    return <Badge variant="fechado">{ROTULO_ETAPA.fechado}</Badge>;
  }

  async function selecionar(novaEtapa: string) {
    const etapaAnterior = etapa;
    setEtapa(novaEtapa as EtapaEsteira);
    setErro(null);
    setSalvando(true);
    const resultado = await atualizarEtapaEsteira(orcamentoId, novaEtapa);
    setSalvando(false);
    if (resultado.ok) {
      onAtualizado(novaEtapa as EtapaEsteira);
    } else {
      setEtapa(etapaAnterior);
      setErro(resultado.erro ?? "Não foi possível atualizar a etapa do orçamento.");
    }
  }

  return (
    <div className="flex items-center gap-sm">
      <Select value={etapa} onValueChange={selecionar} disabled={salvando}>
        <SelectTrigger className="w-48" aria-label="Etapa da esteira">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ETAPAS_NAO_TERMINAIS.map((valor) => (
            <SelectItem key={valor} value={valor}>
              {ROTULO_ETAPA[valor]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {erro && <p className="text-legenda text-erro">{erro}</p>}
    </div>
  );
}
