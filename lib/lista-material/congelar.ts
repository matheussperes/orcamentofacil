"use server";

import { createClient } from "@/lib/supabase/server";
import type { SnapshotListaMaterial } from "./tipos";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — Server Action que
// congela a lista de material/pré-pedido de um orçamento: INSERT em
// `lista_material` (tabela já existe, Task 11.2 — RLS SELECT/INSERT/DELETE
// por organização, SEM UPDATE, imutável por design). "Regenerar" a lista é
// chamar esta função de novo (nova linha), nunca editar a anterior — mesmo
// texto do comentário da migration.
//
// Mesmo padrão de autenticação/organização de `lib/orcamento/criar.ts` e
// `lib/ambiente/salvar.ts`: `organizacao_id` NUNCA vem do client, sempre lido
// de `perfil` do usuário autenticado — a RLS `with check` confirma de novo
// no banco.
//
// Decisão de escopo (contrato: "a relação exata entre esta ação e o status
// do orçamento fica a seu critério, documente"): este INSERT NÃO altera
// `orcamento.status`. `StatusOrcamento` hoje só tem 'rascunho' | 'enviado' |
// 'aprovado' | 'recusado' (`lib/orcamento/buscar.ts`) — não existe um valor
// "fechado"/"congelado" (o próprio contrato confirma isso: "hoje sem
// transição própria de fechado"). Adicionar um novo valor ao enum de status
// seria uma decisão de schema/domínio fora do escopo desta task (o contrato
// pede para PARAR e reportar ao Maestro nesse caso). Congelar a lista de
// material é tratado como um evento independente e repetível — cada
// congelamento é só um registro auditável a mais; a UI (`CorteMaterialLab`)
// mostra "última lista congelada em <data>" lendo a linha mais recente
// (`buscarUltimaListaMaterial`), não um campo de status.
export interface ResultadoCongelarListaMaterial {
  ok: boolean;
  erro?: string;
  congeladoEm?: string;
}

export async function congelarListaMaterial(
  orcamentoId: string,
  snapshot: SnapshotListaMaterial
): Promise<ResultadoCongelarListaMaterial> {
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
    console.error("[lista-material] falha ao buscar organizacao_id do perfil:", erroPerfil?.message);
    return { ok: false, erro: "Não foi possível identificar sua organização. Tente novamente." };
  }

  const organizacaoId = perfil.organizacao_id as string;

  const { data, error } = await supabase
    .from("lista_material")
    .insert({ organizacao_id: organizacaoId, orcamento_id: orcamentoId, snapshot })
    .select("criado_em")
    .single();

  if (error || !data) {
    console.error("[lista-material] falha ao congelar lista de material:", error?.message);
    return { ok: false, erro: "Não foi possível congelar a lista de material. Tente novamente." };
  }

  return { ok: true, congeladoEm: data.criado_em as string };
}
