import { createClient } from "@/lib/supabase/server";
import { COLUNAS_PRODUTO, produtoRowDeLinha, type ProdutoRow } from "./tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — leitura SERVER-SIDE
// pra `/catalogo` (CRUD): ao contrário de `lib/produto/buscar.ts` (consumo
// real, só produtos ATIVOS), aqui lê TODOS (ativos e inativos) — a tela de
// catálogo precisa mostrar/gerenciar os dois (Design-System.md Seção 7.6:
// badge "Ativo"; toggle ativo em vez de excluir de verdade, ver
// `lib/produto/acoes.ts`). Chamada pelo Server Component da rota
// (`app/(app)/catalogo/page.tsx`), mesmo espírito de
// `lib/perfil/carregar.ts::carregarPerfilOrganizacao`.
//
// `erro: true` distingue "consulta falhou de verdade" (estado ERRO da
// Design-System.md Seção 8, `CatalogoLab` mostra `Alert` erro) de "consulta
// funcionou e a organização simplesmente não tem produto nenhum ainda"
// (estado VAZIO — não deveria acontecer em produção, a trigger de seed
// sempre popula, mas é tecnicamente possível numa organização criada antes
// da Task 11.4). Sem essa distinção os dois cenários ficariam indistintos
// (ambos "lista vazia").
export interface ProdutosListados {
  produtos: ProdutoRow[];
  erro: boolean;
}

export async function listarProdutos(): Promise<ProdutosListados> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { produtos: [], erro: true };
  }

  const { data, error } = await supabase
    .from("produto")
    .select(COLUNAS_PRODUTO)
    .order("tipo", { ascending: true })
    .order("nome", { ascending: true });

  if (error || !data) {
    console.error("[produto] falha ao listar produtos do catálogo:", error?.message);
    return { produtos: [], erro: true };
  }

  return {
    produtos: data.map((linha) => produtoRowDeLinha(linha as Record<string, unknown>)),
    erro: false,
  };
}
