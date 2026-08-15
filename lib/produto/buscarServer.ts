import { createClient } from "@/lib/supabase/server";
import { CATALOGO_PADRAO, type Catalogo } from "@/lib/catalog";
import { produtosParaCatalogoComFallback } from "./mapear";
import { COLUNAS_PRODUTO, produtoRowDeLinha } from "./tipos";

// Task 5.7-5.9 (contrato .maestro/state/contracts/5.7-5.9.md) — variante
// SERVER-SIDE de `lib/produto/buscar.ts::buscarCatalogoReal`: mesma query
// (`COLUNAS_PRODUTO`, `ativo = true`) e mesmo mapeamento
// (`produtosParaCatalogoComFallback`), só trocando `lib/supabase/client` por
// `lib/supabase/server` (mesmo padrão de
// `lib/precificacao/carregarConfiguracao.ts`) — necessária porque
// `buscarDadosDashboard()` roda no servidor e o client-side usa o browser
// client, que não funciona lá.
export async function buscarCatalogoRealServer(): Promise<Catalogo> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("produto")
      .select(COLUNAS_PRODUTO)
      .eq("ativo", true);

    if (error) {
      console.error("[produto] falha ao buscar catálogo real (server):", error.message);
      return CATALOGO_PADRAO;
    }
    if (!data || data.length === 0) {
      return CATALOGO_PADRAO;
    }

    const produtos = data.map((linha) => produtoRowDeLinha(linha as Record<string, unknown>));
    return produtosParaCatalogoComFallback(produtos);
  } catch (erro) {
    console.error("[produto] falha inesperada ao buscar catálogo real (server):", erro);
    return CATALOGO_PADRAO;
  }
}
