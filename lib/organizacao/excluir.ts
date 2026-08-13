"use server";

import { createClient as createServiceRoleClient, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Nomes dos buckets repetidos aqui em vez de importados de
// `lib/organizacao/logo-storage.ts` / `lib/perfil/foto-storage.ts`: os dois
// módulos abrem com `import ... from "@/lib/supabase/client"`, e
// `lib/supabase/server.ts` proíbe explicitamente misturar os dois contextos de
// cookies no mesmo módulo. São constantes de uma string só, fixadas pelas
// migrations `20260812130418_storage_organizacao_logos.sql` e
// `20260813140434_perfil_foto_url_storage.sql`.
const BUCKET_ORGANIZACAO_LOGOS = "organizacao-logos";
const BUCKET_PERFIL_FOTOS = "perfil-fotos";
// `linha-proposta-renders` (`20260730190000_storage_linha_proposta_renders.sql`)
// também usa `{organizacao_id}/...` e guarda render das propostas da org.
// A Seção 7.3 não o cita porque é anterior à Task 13.6a, que criou o bucket —
// a spec é que está desatualizada (achado do security-auditor, observação 1).
// Incluído aqui porque deixá-lo de fora contraria a própria armadilha 3
// ("senão sobra arquivo órfão — e, com ele, dado que deveria ter sido
// eliminado"). `texturas` é conteúdo global curado, não por-tenant: não entra.
const BUCKET_LINHA_PROPOSTA_RENDERS = "linha-proposta-renders";

// Task 4.15 (contrato .maestro/state/contracts/4.15.md; domínio em
// `docs/Modelo-de-Dominio.md` Seção 7.3) — "excluir conta" = excluir a
// ORGANIZAÇÃO INTEIRA. Destruição imediata e irreversível: sem soft-delete,
// sem lixeira, sem prazo de retenção (decisão do operador, Q-13).
//
// Esta Server Action é a ÚNICA porta. Nenhuma política de `delete` em
// `organizacao` existe para `authenticated`, e nenhuma vai ser criada (7.3,
// "Regras da ação" 3): criar uma deixaria qualquer membro apagar o tenant por
// uma chamada PostgREST, contornando a checagem de papel. Ter uma porta só é o
// que torna a checagem de aplicação suficiente.
//
// A sequência abaixo NÃO é intercambiável — cada passo existe por causa de uma
// armadilha do schema documentada na 7.3:
//   0. papel `admin` (Q-17) — PRIMEIRA operação, antes de qualquer leitura ou
//      escrita. Não-admin/sem sessão: E-D1, e nada é lido, apagado ou chamado.
//   1. lê `perfil.id` de todos os perfis da org ANTES do delete (armadilha 2 —
//      depois eles não existem mais e não há como saber quem apagar do Auth).
//   2. `delete from organizacao` — a cascata (`on delete cascade` em toda
//      tabela de tenant) apaga perfil, cliente, produto, gabarito (só os da
//      org; globais com `organizacao_id is null` sobrevivem), orcamento e, por
//      ele, ambiente/parede/linha_proposta/lista_material/elemento_continuo/
//      elemento_parede_preset. Depende da migration
//      `20260813160000_orcamento_cliente_id_no_action.sql` (armadilha 1).
//   3. expurga o Storage — os três buckets por-tenant (armadilha 3: Storage não
//      tem FK, nenhuma cascata alcança os objetos).
//   4. Admin API: apaga cada usuário de `auth.users` (armadilha 2 de novo — a
//      cascata vai do pai para o filho, o login sobrevive ao `perfil`).
//
// Ordem 3 antes de 4 (contrato Seção 2): apagar o login primeiro e falhar no
// Storage deixaria arquivo pessoal órfão sem nenhum registro de quem era o
// dono. Com esta ordem, uma falha no meio deixa no máximo um login zumbi —
// estado tolerável e detectável (7.3, casos de borda: usuário sem perfil, RLS
// nega tudo), e esta rotina é reexecutável para limpá-lo.

export interface ResultadoExcluirOrganizacao {
  ok: boolean;
  erro?: string;
  codigo?: string;
}

const E_D1: ResultadoExcluirOrganizacao = {
  ok: false,
  erro: "Só o administrador da organização pode excluir a conta.",
  codigo: "NAO_AUTORIZADO_EXCLUIR_ORG",
};

/** `storage.list` devolve no máximo 100 objetos por padrão e não avisa que
 * truncou. `organizacao-logos`/`perfil-fotos` guardam um arquivo por prefixo,
 * mas `linha-proposta-renders` guarda UM POR LINHA DE PROPOSTA
 * (`{org}/{linhaId}.png`) — uma org real passa de 100 fácil. Sem paginar, o
 * expurgo deixaria resto em silêncio. */
const TAMANHO_PAGINA_STORAGE = 100;

/** Remove todos os objetos sob um prefixo de um bucket. Storage não tem FK:
 * sem isto sobra arquivo órfão — e, com ele, dado pessoal que a exclusão
 * deveria ter eliminado (7.3, armadilha 3). Erro aqui é logado e NÃO aborta a
 * rotina: a organização já foi apagada e o passo seguinte (limpar o Auth) é
 * mais importante que o arquivo residual. */
async function expurgarPrefixo(
  admin: SupabaseClient,
  bucket: string,
  prefixo: string
): Promise<void> {
  // Sempre relê a partir do offset 0: os objetos da página anterior acabaram de
  // ser removidos, então a página seguinte "sobe" para o lugar deles. Paginar
  // por offset crescente aqui PULARIA metade dos arquivos.
  for (;;) {
    const { data: objetos, error } = await admin.storage
      .from(bucket)
      .list(prefixo, { limit: TAMANHO_PAGINA_STORAGE });

    if (error) {
      console.error(`[organizacao/excluir] falha ao listar ${bucket}/${prefixo}:`, error.message);
      return;
    }
    if (!objetos || objetos.length === 0) {
      return;
    }

    const paths = objetos.map((objeto) => `${prefixo}/${objeto.name}`);
    const { error: erroRemocao } = await admin.storage.from(bucket).remove(paths);

    if (erroRemocao) {
      // Sem `return` aqui a repetição viraria loop infinito (a mesma página
      // continuaria listando). Aborta este prefixo e deixa o log.
      console.error(`[organizacao/excluir] falha ao remover ${bucket}/${prefixo}:`, erroRemocao.message);
      return;
    }

    if (objetos.length < TAMANHO_PAGINA_STORAGE) {
      return;
    }
  }
}

export async function excluirOrganizacao(): Promise<ResultadoExcluirOrganizacao> {
  const supabase = await createClient();

  // Passo 0 — autorização. `auth.uid()` resolvido no servidor, NUNCA um id
  // vindo do client. Sem sessão é ausência de papel, e ausência de papel não é
  // `admin`: mesma rejeição E-D1, sem vazar se a org existe.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return E_D1;
  }

  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfil")
    .select("organizacao_id, papel")
    .eq("id", user.id)
    .maybeSingle();

  if (erroPerfil || !perfil?.organizacao_id || perfil.papel !== "admin") {
    if (erroPerfil) {
      console.error("[organizacao/excluir] falha ao ler perfil do usuário:", erroPerfil.message);
    }
    return E_D1;
  }

  const organizacaoId = perfil.organizacao_id as string;

  // Só a partir daqui o `service_role` entra em cena — depois da autorização,
  // nunca antes.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error("[organizacao/excluir] SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.");
    return { ok: false, erro: "Não foi possível excluir a conta agora. Tente novamente." };
  }

  const admin = createServiceRoleClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Passo 1 — perfis ANTES do delete (armadilha 2). Leitura pelo `admin`
  // porque precisa alcançar TODOS os membros da org, não só o chamador.
  const { data: perfis, error: erroPerfis } = await admin
    .from("perfil")
    .select("id")
    .eq("organizacao_id", organizacaoId);

  if (erroPerfis) {
    console.error("[organizacao/excluir] falha ao listar perfis da organização:", erroPerfis.message);
    return { ok: false, erro: "Não foi possível excluir a conta agora. Tente novamente." };
  }

  const perfilIds: string[] = (perfis ?? []).map((p) => p.id as string);

  // Passo 2 — o delete que dispara toda a cascata.
  const { error: erroDelete } = await admin.from("organizacao").delete().eq("id", organizacaoId);

  if (erroDelete) {
    console.error("[organizacao/excluir] falha ao excluir a organização:", erroDelete.message);
    return { ok: false, erro: "Não foi possível excluir a conta agora. Tente novamente." };
  }

  // Passo 3 — Storage: logo da org (`{organizacao_id}/logo.<ext>`) e foto
  // pessoal de cada membro (`{perfil_id}/foto.<ext>`).
  await expurgarPrefixo(admin, BUCKET_ORGANIZACAO_LOGOS, organizacaoId);
  await expurgarPrefixo(admin, BUCKET_LINHA_PROPOSTA_RENDERS, organizacaoId);
  for (const perfilId of perfilIds) {
    await expurgarPrefixo(admin, BUCKET_PERFIL_FOTOS, perfilId);
  }

  // Passo 4 — Admin API: o login não morre por cascata. Falha individual é
  // logada e não interrompe os demais usuários (a rotina é reexecutável).
  for (const perfilId of perfilIds) {
    const { error: erroAuth } = await admin.auth.admin.deleteUser(perfilId);
    if (erroAuth) {
      console.error(`[organizacao/excluir] falha ao remover ${perfilId} do Auth:`, erroAuth.message);
    }
  }

  // Sessão do chamador: o `perfil` não existe mais, toda RLS nega. Encerra o
  // cookie para o usuário cair no gate de `middleware.ts` já deslogado.
  await supabase.auth.signOut();

  return { ok: true };
}
