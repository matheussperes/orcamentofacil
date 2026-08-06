"use server";

import { createClient } from "@/lib/supabase/server";
import type { EstadoAmbiente, ResultadoSalvarAmbiente } from "./estado";
import { linhaDeElementoContinuo, linhaDeParede } from "./mapear";

// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md) — Server Action que
// persiste o conteúdo PROFUNDO de Ambientes de um orçamento (largura/altura/
// elementos/itens de cada parede + módulos + elementos contínuos). Chamado a
// partir de `components/ambientes/AmbientesTabConectada.tsx` (client) quando
// o usuário clica em "Salvar alterações" — AÇÃO EXPLÍCITA, nunca autosave.
//
// Task 2.3-2.6 — [V2.1] fim do singleton: itera por TODOS os ambientes/
// paredes de `estado.ambientes` (não mais "a única parede"). Cadastro/
// renome/exclusão/reordenação de ambiente/parede são AÇÕES IMEDIATAS
// (`lib/ambiente/mutar.ts`, chamando `lib/ambiente/acoes.ts` direto) — esta
// função NUNCA cria/renomeia/exclui ambiente ou parede por conta própria,
// EXCETO o caso abaixo:
//
// Bootstrap do orçamento novo: um orçamento sem nenhuma linha em `ambiente`/
// `parede` ainda começa com 1 ambiente/1 parede só em MEMÓRIA (IDs sentinela
// `AMBIENTE_PADRAO_ID`/`PAREDE_PADRAO_ID`, ver `lib/ambiente/estado.ts`) —
// mesmo comportamento de hoje ("estado padrão limpo, sem erro"). Esta função
// tenta UPDATE por id; se 0 linhas forem afetadas (a linha ainda não existe),
// cria a linha real (mesmo espírito do "upsert manual" que já existia aqui
// antes da 2.3-2.6, só que agora por ambiente/parede, não por orçamento
// inteiro). Qualquer ambiente/parede criado pelo usuário via botão "+" já
// nasce com id real (ação imediata) — na prática, o ramo de criação aqui só
// dispara para o par sentinela de um orçamento nunca salvo.
//
// Mesmo padrão de autenticação/organização de `lib/orcamento/criar.ts`:
// nunca confia em organizacao_id vindo do client — busca em `perfil` do
// usuário autenticado, e RLS `with check` de cada tabela confirma de novo no
// banco.
//
// [V2.1] Invariante de escrita (Task 0.4, Modelo de Domínio 3.2.1): esta
// função NUNCA escreve em `organizacao.alturas_padrao` — perfil só muda em
// `/perfil` (`lib/perfil/`).
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

  // 1. orcamento.itens = módulos (ModuloOrcamento[]) — escopo: orçamento
  // inteiro, não muda com a Task 2.3-2.6.
  const { error: erroItens } = await supabase
    .from("orcamento")
    .update({ itens: estado.modulos })
    .eq("id", orcamentoId);
  if (erroItens) {
    console.error("[ambiente] falha ao salvar itens do orçamento:", erroItens.message);
    return { ok: false, erro: "Não foi possível salvar os módulos do orçamento." };
  }

  // 2. Cada ambiente e cada parede — update-ou-cria (ver nota de bootstrap
  // acima). Requests sequenciais (mesma limitação de antes: não há
  // transação client-side via supabase-js/PostgREST).
  const idsRemapeados = { ambientes: {} as Record<string, string>, paredes: {} as Record<string, string> };

  for (const ambiente of estado.ambientes) {
    const { data: ambienteExistente, error: erroBuscarAmbiente } = await supabase
      .from("ambiente")
      .select("id")
      .eq("id", ambiente.id)
      .eq("organizacao_id", organizacaoId)
      .maybeSingle();
    if (erroBuscarAmbiente) {
      console.error("[ambiente] falha ao verificar ambiente existente:", erroBuscarAmbiente.message);
      return { ok: false, erro: "Não foi possível salvar o ambiente." };
    }

    let ambienteId = ambiente.id;
    if (!ambienteExistente) {
      const { data: novoAmbiente, error: erroCriarAmbiente } = await supabase
        .from("ambiente")
        .insert({
          organizacao_id: organizacaoId,
          orcamento_id: orcamentoId,
          nome: ambiente.nome,
          ordem: ambiente.ordem,
        })
        .select("id")
        .single();
      if (erroCriarAmbiente || !novoAmbiente) {
        console.error("[ambiente] falha ao criar ambiente ao salvar:", erroCriarAmbiente?.message);
        return { ok: false, erro: "Não foi possível salvar o ambiente." };
      }
      ambienteId = novoAmbiente.id as string;
      idsRemapeados.ambientes[ambiente.id] = ambienteId;
    }

    for (const parede of ambiente.paredes) {
      // Overrides de junção só fazem sentido dentro de uma parede (as
      // posições x são relativas a ela) — a lista em `estado.overrides` é
      // FLAT por orçamento (itemId já desambigua), então cada parede recebe
      // só os overrides cujo par referencia algum item dela.
      const overridesDaParede = estado.overrides.filter((o) =>
        parede.itens.some((i) => i.itemId === o.itemIdA || i.itemId === o.itemIdB)
      );

      const linha = linhaDeParede({
        organizacaoId,
        ambienteId,
        parede,
        overrides: overridesDaParede,
      });

      const { data: paredeExistente, error: erroBuscarParede } = await supabase
        .from("parede")
        .select("id")
        .eq("id", parede.id)
        .eq("organizacao_id", organizacaoId)
        .maybeSingle();
      if (erroBuscarParede) {
        console.error("[ambiente] falha ao verificar parede existente:", erroBuscarParede.message);
        return { ok: false, erro: "Não foi possível salvar a parede." };
      }

      if (paredeExistente) {
        const { error: erroParede } = await supabase
          .from("parede")
          .update(linha)
          .eq("id", parede.id)
          .eq("organizacao_id", organizacaoId);
        if (erroParede) {
          console.error("[ambiente] falha ao salvar parede:", erroParede.message);
          return { ok: false, erro: "Não foi possível salvar a parede." };
        }
      } else {
        const { data: novaParede, error: erroParede } = await supabase
          .from("parede")
          .insert({ ...linha, nome: parede.nome, ordem: parede.ordem })
          .select("id")
          .single();
        if (erroParede || !novaParede) {
          console.error("[ambiente] falha ao salvar parede:", erroParede?.message);
          return { ok: false, erro: "Não foi possível salvar a parede." };
        }
        idsRemapeados.paredes[parede.id] = novaParede.id as string;
      }
    }
  }

  // 3. elemento_continuo — sincroniza por delete + insert do conjunto inteiro
  // (decisão do contrato 13.3d, "aceitável, documente"): mais simples que
  // diffar linha a linha, e o `id` de cada `ElementoContinuo` em memória é
  // sintético de UI (`novoElementoId()`, sem significado fora da sessão do
  // browser) — depois de salvar, um reload busca os ids REAIS (uuid) gerados
  // pelo insert, via `carregarEstadoAmbiente`. Escopo: orçamento inteiro, não
  // muda com a Task 2.3-2.6.
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

  const houveRemapeamento =
    Object.keys(idsRemapeados.ambientes).length > 0 || Object.keys(idsRemapeados.paredes).length > 0;

  return houveRemapeamento ? { ok: true, idsRemapeados } : { ok: true };
}
