"use server";

import { createClient } from "@/lib/supabase/server";
import {
  criarAmbiente,
  renomearAmbiente,
  excluirAmbiente,
  reordenarAmbientes,
  criarParede,
  atualizarParede,
  excluirParede,
  reordenarParedes,
} from "./acoes";
import { carregarAmbientesCompletos } from "./carregar";
import { modulosDeJson } from "./mapear";
import type { ComandoAmbiente, ResultadoMutarAmbientes } from "./estado";

// Task 2.3-2.6 — dispatcher único de CRUD IMEDIATO de ambiente/parede
// (criar/renomear/excluir/reordenar), chamado por `AmbientesTabConectada` a
// cada ação do usuário na lista (nunca autosave — "Salvar alterações"
// continua só para o conteúdo profundo da parede, ver `salvar.ts`). Delega
// toda autorização/validação/cascata a `lib/ambiente/acoes.ts` (Task
// 0.1-0.3) — este módulo só despacha e devolve a árvore fresca pra
// `AmbientesLab` substituir o estado local, nunca reimplementa a mutação em
// memória.

// Mesmo default de `paredeInicial()` (estado.ts) — ambiente novo já nasce
// com 1 parede, senão a seleção em `AmbientesLab` ficaria sem nada pra
// mostrar (não existe "criarAmbienteComParede" no backend).
const LARGURA_PADRAO_MM = 3000;
const ALTURA_PADRAO_MM = 2700;

export async function mutarAmbientes(
  orcamentoId: string,
  comando: ComandoAmbiente
): Promise<ResultadoMutarAmbientes> {
  const resultado = await executarComando(orcamentoId, comando);
  if (!resultado.ok) return { ok: false, erro: resultado.erro };

  const supabase = await createClient();
  const { ambientes } = await carregarAmbientesCompletos(supabase, orcamentoId);

  // excluirAmbiente/excluirParede já limparam órfãos de `orcamento.itens` no
  // banco (`removerItensOrfaosDoOrcamento`, acoes.ts) — aqui só refletimos o
  // resultado fresco pro estado local, nunca recalculamos a regra de novo.
  let modulos: ResultadoMutarAmbientes["modulos"];
  if (comando.tipo === "excluirAmbiente" || comando.tipo === "excluirParede") {
    const { data: orcamentoRow } = await supabase
      .from("orcamento")
      .select("itens")
      .eq("id", orcamentoId)
      .maybeSingle();
    modulos = modulosDeJson(orcamentoRow?.itens ?? null);
  }

  return { ok: true, ambientes, modulos };
}

async function executarComando(
  orcamentoId: string,
  comando: ComandoAmbiente
): Promise<{ ok: boolean; erro?: string }> {
  switch (comando.tipo) {
    case "criarAmbiente": {
      const ambiente = await criarAmbiente(orcamentoId, comando.nome);
      if (!ambiente.ok || !ambiente.id) return ambiente;
      return criarParede(ambiente.id, "Parede 1", LARGURA_PADRAO_MM, ALTURA_PADRAO_MM);
    }
    case "renomearAmbiente":
      return renomearAmbiente(comando.ambienteId, comando.nome);
    case "excluirAmbiente":
      return excluirAmbiente(comando.ambienteId);
    case "reordenarAmbientes":
      return reordenarAmbientes(orcamentoId, comando.idsNaNovaOrdem);
    case "criarParede":
      return criarParede(comando.ambienteId, comando.nome, LARGURA_PADRAO_MM, ALTURA_PADRAO_MM);
    case "renomearParede":
      return atualizarParede(comando.paredeId, { nome: comando.nome });
    case "excluirParede":
      return excluirParede(comando.paredeId);
    case "reordenarParedes":
      return reordenarParedes(comando.ambienteId, comando.idsNaNovaOrdem);
  }
}
