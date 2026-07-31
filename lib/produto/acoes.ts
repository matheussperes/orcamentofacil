"use server";

import { createClient } from "@/lib/supabase/server";
import { produtoRowDeLinha, COLUNAS_PRODUTO, type ProdutoRow, type TipoProduto } from "./tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — Server Actions de
// CRUD de `produto` (`/catalogo`). RLS-safe por construção, mesmo padrão de
// `lib/orcamento/criar.ts` (insert: busca `organizacao_id` do `perfil` do
// usuário autenticado, nunca confia num valor vindo do client) e de
// `lib/orcamento/salvarConfiguracaoPrecificacao.ts` (update/toggle: não
// precisa de `organizacao_id` porque a policy `produto_update_propria_org`
// já escopa a escrita por `org_do_usuario()` — um `id` de outra organização
// simplesmente não passa no `WITH CHECK`).
//
// Decisão de escopo (contrato: "toggle ativo em vez de excluir de verdade é
// aceitável se preferir... decisão sua, documente"): esta task NÃO implementa
// exclusão real (`DELETE`) — só `alternarAtivoProduto` (toggle da coluna
// `ativo`, que já existe na tabela). Motivo: preço usado num orçamento já
// congelado (`lista_material`, Task 13.4) referencia o produto por VALOR
// congelado no snapshot, não por chave estrangeira — mas apagar a linha de
// `produto` de qualquer forma perde o histórico de "que produto/preço foi
// esse" para consulta futura, sem ganho real sobre desativar. Toda ação de
// "Remover" em `/catalogo` (`components/catalogo/*`) chama
// `alternarAtivoProduto(id, false)`, nunca uma exclusão de verdade.
export interface DadosProduto {
  tipo: TipoProduto;
  nome: string;
  especificacao: Record<string, unknown>;
  preco: number;
  fornecedor?: string;
}

export interface ResultadoProduto {
  ok: boolean;
  erro?: string;
  produto?: ProdutoRow;
}

function validarDados(dados: DadosProduto): string | null {
  if (!dados.nome.trim()) {
    return "Informe o nome do produto.";
  }
  if (!Number.isFinite(dados.preco) || dados.preco < 0) {
    return "Informe um preço válido (maior ou igual a zero).";
  }
  if (dados.tipo === "chapa") {
    const cor = String(dados.especificacao.cor ?? "").trim();
    const espessura = Number(dados.especificacao.espessura ?? 0);
    if (!cor || espessura <= 0) {
      return "Informe a cor e a espessura da chapa.";
    }
  }
  if (dados.tipo === "ferragem") {
    const codigo = String(dados.especificacao.codigo ?? "").trim();
    if (!codigo) {
      return "Selecione o código da ferragem.";
    }
  }
  return null;
}

export async function criarProduto(dados: DadosProduto): Promise<ResultadoProduto> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const erroValidacao = validarDados(dados);
  if (erroValidacao) {
    return { ok: false, erro: erroValidacao };
  }

  // `organizacao_id` só é setado aqui, no INSERT — lido do `perfil` do
  // usuário autenticado, nunca do client (mesmo padrão de
  // `lib/orcamento/criar.ts`).
  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfil")
    .select("organizacao_id")
    .eq("id", user.id)
    .maybeSingle();

  if (erroPerfil || !perfil) {
    console.error("[produto] falha ao buscar organizacao_id do perfil:", erroPerfil?.message);
    return { ok: false, erro: "Não foi possível identificar sua organização. Tente novamente." };
  }

  const { data: linha, error } = await supabase
    .from("produto")
    .insert({
      organizacao_id: perfil.organizacao_id as string,
      tipo: dados.tipo,
      nome: dados.nome.trim(),
      especificacao: dados.especificacao,
      preco: dados.preco,
      fornecedor: dados.fornecedor?.trim() || null,
    })
    .select(COLUNAS_PRODUTO)
    .single();

  if (error || !linha) {
    console.error("[produto] falha ao criar produto:", error?.message);
    return { ok: false, erro: "Não foi possível salvar o produto. Tente novamente." };
  }

  return { ok: true, produto: produtoRowDeLinha(linha as Record<string, unknown>) };
}

export async function atualizarProduto(id: string, dados: DadosProduto): Promise<ResultadoProduto> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const erroValidacao = validarDados(dados);
  if (erroValidacao) {
    return { ok: false, erro: erroValidacao };
  }

  const { data: linha, error } = await supabase
    .from("produto")
    .update({
      nome: dados.nome.trim(),
      especificacao: dados.especificacao,
      preco: dados.preco,
      fornecedor: dados.fornecedor?.trim() || null,
    })
    .eq("id", id)
    .select(COLUNAS_PRODUTO)
    .single();

  if (error || !linha) {
    console.error("[produto] falha ao atualizar produto:", error?.message);
    return { ok: false, erro: "Não foi possível salvar as alterações deste produto." };
  }

  return { ok: true, produto: produtoRowDeLinha(linha as Record<string, unknown>) };
}

export async function alternarAtivoProduto(id: string, ativo: boolean): Promise<ResultadoProduto> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { data: linha, error } = await supabase
    .from("produto")
    .update({ ativo })
    .eq("id", id)
    .select(COLUNAS_PRODUTO)
    .single();

  if (error || !linha) {
    console.error("[produto] falha ao alternar status do produto:", error?.message);
    return {
      ok: false,
      erro: ativo
        ? "Não foi possível reativar este produto."
        : "Não foi possível desativar este produto.",
    };
  }

  return { ok: true, produto: produtoRowDeLinha(linha as Record<string, unknown>) };
}
