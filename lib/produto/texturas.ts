import { createClient } from "@/lib/supabase/client";

// Task 3.13 (catálogo-front) — leitura CLIENT-SIDE do bucket `texturas`
// (`supabase/migrations/20260811110000_storage_texturas.sql`, Task 3.13
// catálogo-back): bucket PÚBLICO (`public = true`) e read-only para
// `authenticated` — nenhum `.upload()`/`.remove()` aqui, só
// `.list()`/`getPublicUrl()`. Diferente do bucket privado
// `linha-proposta-renders` (`lib/linha-proposta/storage.ts`), que precisa de
// `createSignedUrl` porque não é público — aqui a URL pública é estável e
// sem custo, então usamos `getPublicUrl` direto.
export const BUCKET_TEXTURAS = "texturas";

export interface Textura {
  /** Caminho relativo dentro do bucket — é isso que é gravado em
   * `especificacao.texturaUrl` (nunca a URL pública completa). */
  path: string;
  nome: string;
  url: string;
}

/** Lista as imagens disponíveis no bucket `texturas` (raiz, sem subpastas —
 * curadoria do operador). Bucket vazio (nenhuma imagem curada ainda) é
 * estado esperado, não erro — devolve lista vazia. */
export async function listarTexturas(): Promise<Textura[]> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET_TEXTURAS).list();
  if (error) {
    console.error("[produto] falha ao listar texturas:", error.message);
    return [];
  }
  return (data ?? [])
    .filter((arquivo) => arquivo.id !== null) // exclui "pastas" (placeholder do Storage)
    .map((arquivo) => ({
      path: arquivo.name,
      nome: arquivo.name,
      url: supabase.storage.from(BUCKET_TEXTURAS).getPublicUrl(arquivo.name).data.publicUrl,
    }));
}

/** Resolve um caminho relativo já salvo (`especificacao.texturaUrl`) pra URL
 * pública de preview. */
export function urlPublicaTextura(path: string): string {
  const supabase = createClient();
  return supabase.storage.from(BUCKET_TEXTURAS).getPublicUrl(path).data.publicUrl;
}
