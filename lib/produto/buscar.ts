import { createClient } from "@/lib/supabase/client";
import { CATALOGO_PADRAO, type Catalogo } from "@/lib/catalog";
import { produtosParaCatalogoComFallback } from "./mapear";
import { COLUNAS_PRODUTO, produtoRowDeLinha } from "./tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — leitura CLIENT-SIDE
// (`lib/supabase/client.ts`, RLS já escopa por organização) dos produtos
// ATIVOS da organização, convertidos pro shape `Catalogo` via
// `produtosParaCatalogoComFallback`. É o substituto direto de
// `carregarCatalogo()` (`lib/catalog.ts`, localStorage) nos três pontos de
// consumo real (`CorteMaterialLab`/`FinanceiroLab`/`EditorItemNucleo`) — só
// muda a ORIGEM do dado (Supabase em vez de localStorage) e a forma de
// chamada (assíncrona em vez de síncrona), o resto do pipeline
// (`catalogoParaPrecos`, `coresDisponiveis`, `espessurasDaCor`) continua
// idêntico porque o shape `Catalogo` não mudou.
//
// Fallback pra `CATALOGO_PADRAO` (contrato, explícito): busca vazia (0
// produtos ativos) ou erro de rede/Supabase indisponível caem no mesmo
// catálogo hardcoded que `carregarCatalogo()` já usava como default — nunca
// deveria acontecer em produção (a trigger `seed_produtos_padrao` sempre
// popula o catálogo no signup), mas os harnesses `/dev/preview/*` não têm
// Supabase real e precisam continuar renderizando algo sensato.
export async function buscarCatalogoReal(): Promise<Catalogo> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("produto")
      .select(COLUNAS_PRODUTO)
      .eq("ativo", true);

    if (error) {
      console.error("[produto] falha ao buscar catálogo real:", error.message);
      return CATALOGO_PADRAO;
    }
    if (!data || data.length === 0) {
      return CATALOGO_PADRAO;
    }

    const produtos = data.map((linha) => produtoRowDeLinha(linha as Record<string, unknown>));
    return produtosParaCatalogoComFallback(produtos);
  } catch (erro) {
    console.error("[produto] falha inesperada ao buscar catálogo real:", erro);
    return CATALOGO_PADRAO;
  }
}
