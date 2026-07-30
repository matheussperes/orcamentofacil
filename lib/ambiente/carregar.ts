import { createClient } from "@/lib/supabase/server";
import { estadoAmbientePadrao, type EstadoAmbiente } from "./estado";
import {
  alturasDeJson,
  elementoContinuoDeLinha,
  modulosDeJson,
  paredeDeLinha,
  type ElementoContinuoRow,
  type ParedeRow,
} from "./mapear";

// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md) — leitura server-side
// do estado profundo de Ambientes de um orçamento, para `/orcamento/[id]`
// (chamado a partir do Server Component da rota, mesmo espírito de
// `lib/orcamento/buscar.ts`). Escopo: 1 ambiente + 1 parede por orçamento
// (AmbientesLab é single-parede; multi é decisão futura, fora desta task) —
// por isso sempre lê só a PRIMEIRA linha de `ambiente`/`parede` do orçamento
// (`order by criado_em asc limit 1`), nunca uma lista.
//
// RLS de todas as tabelas envolvidas (`orcamento`, `organizacao`, `ambiente`,
// `parede`, `elemento_continuo`) já escopa por organização — não repetimos
// esse filtro aqui, mesma decisão de `buscarOrcamentoPorId`.
//
// Nunca lança: um orçamento novo (ninguém salvou Ambientes ainda) não tem
// linha de `ambiente`/`parede`/`elemento_continuo` — devolve o estado padrão
// (parede em branco), que é o comportamento correto do critério de aceite
// ("abrir /orcamento/[id] carrega o estado do Supabase — vazio → estado
// inicial limpo, não erro").
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

  const { data: ambienteRow } = await supabase
    .from("ambiente")
    .select("id")
    .eq("orcamento_id", orcamentoId)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();

  let parede = padrao.parede;
  let overrides = padrao.overrides;

  if (ambienteRow?.id) {
    const { data: paredeRow } = await supabase
      .from("parede")
      .select("id, altura, largura, elementos, itens, overrides_juncao")
      .eq("ambiente_id", ambienteRow.id as string)
      .order("criado_em", { ascending: true })
      .limit(1)
      .maybeSingle();

    const mapeado = paredeDeLinha((paredeRow as ParedeRow | null) ?? null);
    parede = mapeado.parede;
    overrides = mapeado.overrides;
  }

  const { data: elementosRows } = await supabase
    .from("elemento_continuo")
    .select("id, tipo, alvo, posicao, espessura, override, engrossamento")
    .eq("orcamento_id", orcamentoId);

  const elementosContinuos = ((elementosRows as ElementoContinuoRow[] | null) ?? []).map(
    elementoContinuoDeLinha
  );

  return { parede, modulos, alturas, elementosContinuos, overrides };
}
