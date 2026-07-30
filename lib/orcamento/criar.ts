"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — criação de
// orçamento novo: insere `cliente` e `orcamento` (rascunho) e redireciona
// para `/orcamento/[id]`. Server Action ('use server'), não Route Handler —
// o contrato deixou a escolha a critério do Frontend Engineer ("server
// action idiomático, ou route handler, com o server client"); Server Action
// evita definir um endpoint HTTP novo e a serialização manual de
// request/response que um Route Handler exigiria, e é chamável diretamente
// como função assíncrona a partir do Client Component do formulário
// (`components/orcamento/NovoOrcamentoForm.tsx`), preservando o mesmo padrão
// de formulário controlado (useState + handleSubmit) já usado em
// `/signup` (Task 13.3a) — não precisou de `<form action={...}>` nem de
// `useFormState`.
//
// Seleção de cliente EXISTENTE está fora de escopo desta task (contrato):
// todo "novo orçamento" cria um cliente novo, mesmo que o nome já exista na
// organização. Documentado também na UI (NovoOrcamentoForm).

export interface CriarOrcamentoInput {
  nomeCliente: string;
  telefone?: string;
  endereco?: string;
  prazoEntrega?: string;
}

export interface CriarOrcamentoResultado {
  erro: string;
}

/**
 * Cria cliente + orçamento (status "rascunho") e redireciona para
 * `/orcamento/[id]` em caso de sucesso.
 *
 * IMPORTANTE para quem chama esta função: em caso de sucesso ela invoca
 * `redirect()` do `next/navigation`, que lança um erro especial
 * (`NEXT_REDIRECT`) para interromper a execução e navegar — isso é
 * comportamento esperado do Next.js, não uma falha. Por isso a função só
 * "retorna" de verdade (valor `{ erro }`) no caminho de erro; o chamador
 * NUNCA deve envolver esta chamada em try/catch (um catch genérico engoliria
 * o throw de redirecionamento e quebraria a navegação).
 */
export async function criarOrcamento(
  input: CriarOrcamentoInput
): Promise<CriarOrcamentoResultado | undefined> {
  const nome = input.nomeCliente.trim();
  if (!nome) {
    return { erro: "Informe o nome do cliente." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Sua sessão expirou. Faça login novamente." };
  }

  // `organizacao_id` é NOT NULL em `cliente`/`orcamento` e a RLS `with
  // check` exige que bata com `private.org_do_usuario()` — não dá pra
  // confiar em um valor vindo do client, então buscamos o organizacao_id do
  // usuário autenticado em `perfil` (mesmo padrão de leitura já usado em
  // `app/(app)/layout.tsx`, Task 13.3b). RLS de `perfil` restringe a leitura
  // à própria linha (ou mesma org), então isto não vaza dado de outro
  // usuário.
  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfil")
    .select("organizacao_id")
    .eq("id", user.id)
    .maybeSingle();

  if (erroPerfil || !perfil) {
    console.error(
      "[orcamento] falha ao buscar organizacao_id do perfil:",
      erroPerfil?.message
    );
    return { erro: "Não foi possível identificar sua organização. Tente novamente." };
  }

  const organizacaoId = perfil.organizacao_id as string;

  const { data: cliente, error: erroCliente } = await supabase
    .from("cliente")
    .insert({
      organizacao_id: organizacaoId,
      nome,
      telefone: input.telefone?.trim() || null,
      endereco: input.endereco?.trim() || null,
    })
    .select("id")
    .single();

  if (erroCliente || !cliente) {
    console.error("[orcamento] falha ao criar cliente:", erroCliente?.message);
    return { erro: "Não foi possível salvar o cliente. Verifique os dados e tente novamente." };
  }

  const { data: orcamento, error: erroOrcamento } = await supabase
    .from("orcamento")
    .insert({
      organizacao_id: organizacaoId,
      cliente_id: cliente.id as string,
      status: "rascunho",
      prazo_entrega: input.prazoEntrega?.trim() || null,
    })
    .select("id")
    .single();

  if (erroOrcamento || !orcamento) {
    console.error("[orcamento] falha ao criar orçamento:", erroOrcamento?.message);
    return {
      erro: "O cliente foi salvo, mas não foi possível criar o orçamento. Tente novamente.",
    };
  }

  redirect(`/orcamento/${orcamento.id as string}`);
}
