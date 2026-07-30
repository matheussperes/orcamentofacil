"use server";

import { createClient } from "@/lib/supabase/server";
import type { EstadoAmbiente, ResultadoSalvarAmbiente } from "./estado";
import { linhaDeElementoContinuo, linhaDeParede } from "./mapear";

// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md) — Server Action que
// persiste o estado profundo de Ambientes de um orçamento. Chamado a partir
// de `components/ambientes/AmbientesTabConectada.tsx` (client) quando o
// usuário clica em "Salvar alterações" — AÇÃO EXPLÍCITA, nunca autosave (a
// própria `AmbientesLab.tsx` não chama isto sozinha a cada mudança de
// estado).
//
// Mesmo padrão de autenticação/organização de `lib/orcamento/criar.ts`:
// nunca confia em organizacao_id vindo do client — busca em `perfil` do
// usuário autenticado, e RLS `with check` de cada tabela confirma de novo no
// banco.
//
// Ordem das escritas (não há transação client-side possível via
// supabase-js/PostgREST — cada `.update()`/`.insert()` é uma request HTTP
// própria): itens do orçamento → alturas da organização → ambiente → parede
// → elementos contínuos. Se uma falhar no meio, as anteriores já foram
// persistidas (parcialmente salvo) — o Alert de erro deixa isso visível pro
// usuário tentar salvar de novo (idempotente: repetir não duplica nada,
// exceto elemento_continuo, que já é delete+insert do zero por natureza).
export async function salvarEstadoAmbiente(
  orcamentoId: string,
  estado: EstadoAmbiente
): Promise<ResultadoSalvarAmbiente> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfil")
    .select("organizacao_id")
    .eq("id", user.id)
    .maybeSingle();

  if (erroPerfil || !perfil) {
    console.error("[ambiente] falha ao buscar organizacao_id do perfil:", erroPerfil?.message);
    return { ok: false, erro: "Não foi possível identificar sua organização. Tente novamente." };
  }

  const organizacaoId = perfil.organizacao_id as string;

  // 1. orcamento.itens = módulos (ModuloOrcamento[])
  const { error: erroItens } = await supabase
    .from("orcamento")
    .update({ itens: estado.modulos })
    .eq("id", orcamentoId);
  if (erroItens) {
    console.error("[ambiente] falha ao salvar itens do orçamento:", erroItens.message);
    return { ok: false, erro: "Não foi possível salvar os módulos do orçamento." };
  }

  // 2. organizacao.alturas_padrao = alturas (NÍVEL ORG — ver nota em
  // lib/ambiente/estado.ts: sobrescreve o perfil de alturas de toda a
  // marcenaria, não só deste orçamento).
  const { error: erroAlturas } = await supabase
    .from("organizacao")
    .update({ alturas_padrao: estado.alturas })
    .eq("id", organizacaoId);
  if (erroAlturas) {
    console.error("[ambiente] falha ao salvar alturas_padrao:", erroAlturas.message);
    return { ok: false, erro: "Não foi possível salvar as alturas do perfil." };
  }

  // 3. ambiente (1 linha) — upsert manual por orcamento_id (primeiro save
  // cria a linha "Ambiente 1"; saves seguintes reaproveitam o mesmo id).
  const { data: ambienteExistente, error: erroBuscarAmbiente } = await supabase
    .from("ambiente")
    .select("id")
    .eq("orcamento_id", orcamentoId)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (erroBuscarAmbiente) {
    console.error("[ambiente] falha ao buscar ambiente existente:", erroBuscarAmbiente.message);
    return { ok: false, erro: "Não foi possível salvar o ambiente." };
  }

  let ambienteId: string;
  if (ambienteExistente?.id) {
    ambienteId = ambienteExistente.id as string;
  } else {
    const { data: novoAmbiente, error: erroCriarAmbiente } = await supabase
      .from("ambiente")
      .insert({ organizacao_id: organizacaoId, orcamento_id: orcamentoId, nome: "Ambiente 1" })
      .select("id")
      .single();
    if (erroCriarAmbiente || !novoAmbiente) {
      console.error("[ambiente] falha ao criar ambiente:", erroCriarAmbiente?.message);
      return { ok: false, erro: "Não foi possível criar o ambiente." };
    }
    ambienteId = novoAmbiente.id as string;
  }

  // 4. parede (1 linha) — upsert manual por ambiente_id, mesmo espírito.
  const { data: paredeExistente, error: erroBuscarParede } = await supabase
    .from("parede")
    .select("id")
    .eq("ambiente_id", ambienteId)
    .order("criado_em", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (erroBuscarParede) {
    console.error("[ambiente] falha ao buscar parede existente:", erroBuscarParede.message);
    return { ok: false, erro: "Não foi possível salvar a parede." };
  }

  const linhaParede = linhaDeParede({
    organizacaoId,
    ambienteId,
    parede: estado.parede,
    overrides: estado.overrides,
  });

  const { error: erroParede } = paredeExistente?.id
    ? await supabase.from("parede").update(linhaParede).eq("id", paredeExistente.id as string)
    : await supabase.from("parede").insert(linhaParede);
  if (erroParede) {
    console.error("[ambiente] falha ao salvar parede:", erroParede.message);
    return { ok: false, erro: "Não foi possível salvar a parede." };
  }

  // 5. elemento_continuo — sincroniza por delete + insert do conjunto inteiro
  // (decisão do contrato, "aceitável, documente"): mais simples que diffar
  // linha a linha, e o `id` de cada `ElementoContinuo` em memória é sintético
  // de UI (`novoElementoId()`, sem significado fora da sessão do browser) —
  // depois de salvar, um reload busca os ids REAIS (uuid) gerados pelo
  // insert, via `carregarEstadoAmbiente`.
  const { error: erroDelete } = await supabase
    .from("elemento_continuo")
    .delete()
    .eq("orcamento_id", orcamentoId);
  if (erroDelete) {
    console.error("[ambiente] falha ao limpar elementos contínuos:", erroDelete.message);
    return { ok: false, erro: "Não foi possível salvar os elementos contínuos." };
  }

  if (estado.elementosContinuos.length > 0) {
    const linhas = estado.elementosContinuos.map((elemento) =>
      linhaDeElementoContinuo({ organizacaoId, orcamentoId, elemento })
    );
    const { error: erroInsert } = await supabase.from("elemento_continuo").insert(linhas);
    if (erroInsert) {
      console.error("[ambiente] falha ao inserir elementos contínuos:", erroInsert.message);
      return { ok: false, erro: "Não foi possível salvar os elementos contínuos." };
    }
  }

  return { ok: true };
}
