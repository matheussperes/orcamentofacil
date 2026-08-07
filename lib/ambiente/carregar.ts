import { createClient } from "@/lib/supabase/server";
import { estadoAmbientePadrao, type AmbienteItem, type EstadoAmbiente } from "./estado";
import {
  alturasDeJson,
  elementoContinuoDeLinha,
  modulosDeJson,
  paredeDeLinha,
  type ElementoContinuoRow,
  type ParedeRow,
} from "./mapear";
import type { OverrideJuncao } from "@/lib/engine/conjunto";

type SupabaseServidor = Awaited<ReturnType<typeof createClient>>;

// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md) — leitura server-side
// do estado profundo de Ambientes de um orçamento, para `/orcamento/[id]`
// (chamado a partir do Server Component da rota, mesmo espírito de
// `lib/orcamento/buscar.ts`).
//
// Task 2.3-2.6 — [V2.1] deixa de ler só a PRIMEIRA linha de `ambiente`/
// `parede` (`order by criado_em asc limit 1`): agora lê TODOS os ambientes
// do orçamento e TODAS as paredes de cada um, com o conteúdo profundo
// completo (altura/largura/elementos/itens/overrides_juncao) — não só uma
// seleção. Orçamentos são pequenos (poucos ambientes/paredes cada), então
// carregar tudo de uma vez é mais simples e robusto que buscar sob demanda a
// cada troca de seleção no seletor (`AmbientesLab` troca seleção só trocando
// estado local, sem I/O extra).
//
// RLS de todas as tabelas envolvidas (`orcamento`, `organizacao`, `ambiente`,
// `parede`, `elemento_continuo`) já escopa por organização — não repetimos
// esse filtro aqui, mesma decisão de `buscarOrcamentoPorId`.
//
// Nunca lança: um orçamento novo (ninguém salvou Ambientes ainda) não tem
// linha de `ambiente`/`parede`/`elemento_continuo` — devolve o estado padrão
// (1 ambiente/1 parede em memória, nada persistido ainda), que é o
// comportamento correto do critério de aceite ("abrir /orcamento/[id] carrega
// o estado do Supabase — vazio → estado inicial limpo, não erro").
export async function carregarEstadoAmbiente(orcamentoId: string): Promise<EstadoAmbiente> {
  const supabase = await createClient();
  const padrao = estadoAmbientePadrao();

  const { data: orcamentoRow } = await supabase
    .from("orcamento")
    .select("itens, organizacao_id")
    .eq("id", orcamentoId)
    .maybeSingle();

  const modulos = modulosDeJson(orcamentoRow?.itens ?? null);
  const organizacaoId = (orcamentoRow?.organizacao_id as string | undefined) ?? null;

  // organizacao.alturas_padrao — nível ORG, não por orçamento (ver nota em
  // `lib/ambiente/estado.ts`).
  let alturas = padrao.alturas;
  if (organizacaoId) {
    const { data: orgRow } = await supabase
      .from("organizacao")
      .select("alturas_padrao")
      .eq("id", organizacaoId)
      .maybeSingle();
    alturas = alturasDeJson(orgRow?.alturas_padrao ?? null);
  }

  const { ambientes, overrides } = await carregarAmbientesCompletos(supabase, orcamentoId);

  const { data: elementosRows } = await supabase
    .from("elemento_continuo")
    .select("id, tipo, alvo, posicao, espessura, override, engrossamento")
    .eq("orcamento_id", orcamentoId);

  const elementosContinuos = ((elementosRows as ElementoContinuoRow[] | null) ?? []).map(
    elementoContinuoDeLinha
  );

  return {
    ambientes: ambientes.length > 0 ? ambientes : padrao.ambientes,
    modulos,
    alturas,
    elementosContinuos,
    overrides,
  };
}

/** Lê a árvore ambiente→parede inteira do orçamento, com o conteúdo profundo
 * de cada parede — compartilhada por `carregarEstadoAmbiente` e
 * `lib/ambiente/mutar.ts` (que precisa devolver a lista fresca depois de
 * cada CRUD imediato). Devolve também `overrides` já achatado (lista FLAT
 * por orçamento — ver nota de escopo em `lib/ambiente/estado.ts`). */
export async function carregarAmbientesCompletos(
  supabase: SupabaseServidor,
  orcamentoId: string
): Promise<{ ambientes: AmbienteItem[]; overrides: OverrideJuncao[] }> {
  const { data: ambientesRows } = await supabase
    .from("ambiente")
    .select("id, nome, ordem")
    .eq("orcamento_id", orcamentoId)
    .order("ordem", { ascending: true });

  if (!ambientesRows || ambientesRows.length === 0) {
    return { ambientes: [], overrides: [] };
  }

  const ambienteIds = ambientesRows.map((a) => a.id as string);

  const { data: paredesRows } = await supabase
    .from("parede")
    .select("id, nome, ordem, ambiente_id, altura, largura, elementos, itens, overrides_juncao")
    .in("ambiente_id", ambienteIds)
    .order("ordem", { ascending: true });

  const overrides: OverrideJuncao[] = [];

  const ambientes: AmbienteItem[] = ambientesRows.map((a) => {
    const ambienteId = a.id as string;
    const paredesDoAmbiente = (paredesRows ?? []).filter((p) => p.ambiente_id === ambienteId);
    return {
      id: ambienteId,
      nome: a.nome as string,
      ordem: a.ordem as number,
      paredes: paredesDoAmbiente.map((p) => {
        const mapeado = paredeDeLinha(p as unknown as ParedeRow);
        overrides.push(...mapeado.overrides);
        return { ...mapeado.parede, nome: p.nome as string, ordem: p.ordem as number };
      }),
    };
  });

  return { ambientes, overrides };
}
