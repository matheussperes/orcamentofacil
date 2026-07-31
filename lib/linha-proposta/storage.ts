import { createClient } from "@/lib/supabase/client";

// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — client-side (browser
// Supabase client, `lib/supabase/client.ts`) porque o Canvas 2D só existe no
// browser: capturamos o `<canvas>` do modo conjunto do `BoxCanvas`
// (`onCanvasReady`, ver `app/components/BoxCanvas.tsx`), convertemos pra
// `Blob` via `canvas.toDataURL('image/png')` → `fetch(dataUrl).then(r =>
// r.blob())` (mecanismo de captura escolhido — a alternativa seria
// `canvas.toBlob()`, mas o `fetch` do data URL é mais simples de encadear com
// `async/await` sem callback) e fazemos upload pro bucket privado
// `linha-proposta-renders` (migration
// `supabase/migrations/20260730190000_storage_linha_proposta_renders.sql`).
//
// Decisão de leitura (bucket PRIVADO, contrato: "decisão sua de qual
// mecanismo de leitura usar depois, documente"): `linha_proposta.imagem_url`
// guarda o PATH do objeto (`{organizacao_id}/{linha_proposta_id}.png`), NUNCA
// uma URL assinada — uma signed URL expira (`createSignedUrl` abaixo usa 1h),
// e persistir uma URL que expira geraria imagens quebradas depois de algum
// tempo (inclusive na Task 13.6b, PDF imprimível, que vai reaproveitar esse
// mesmo path). A UI resolve o path pra uma signed URL sob demanda, no
// momento de exibir (`obterUrlAssinadaImagemLinha`, chamado pelo componente
// que desenha o `<img>`/thumbnail).
export const BUCKET_LINHA_PROPOSTA_RENDERS = "linha-proposta-renders";

export function pathImagemLinhaProposta(organizacaoId: string, linhaId: string): string {
  return `${organizacaoId}/${linhaId}.png`;
}

export type ResultadoUploadImagem = { ok: true; path: string } | { ok: false; erro: string };

/** Faz upload do PNG capturado do canvas pro bucket privado. `upsert: true`
 * porque o path é determinístico por linha (`{org}/{linhaId}.png`) — cada
 * regeneração de render SUBSTITUI o arquivo anterior da mesma linha, nunca
 * acumula versões órfãs no bucket. */
export async function uploadImagemLinhaProposta(
  organizacaoId: string,
  linhaId: string,
  blob: Blob
): Promise<ResultadoUploadImagem> {
  const supabase = createClient();
  const path = pathImagemLinhaProposta(organizacaoId, linhaId);
  const { error } = await supabase.storage.from(BUCKET_LINHA_PROPOSTA_RENDERS).upload(path, blob, {
    upsert: true,
    contentType: "image/png",
  });
  if (error) {
    console.error("[linha-proposta] falha ao subir imagem de render:", error.message);
    return { ok: false, erro: "Não foi possível salvar a imagem desta linha. Tente novamente." };
  }
  return { ok: true, path };
}

/** Resolve um path do bucket privado pra uma URL assinada temporária (1h) —
 * chamado sob demanda pela UI que exibe a imagem (nunca persistido). */
export async function obterUrlAssinadaImagemLinha(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET_LINHA_PROPOSTA_RENDERS).createSignedUrl(path, 3600);
  if (error || !data) {
    console.error("[linha-proposta] falha ao gerar URL assinada:", error?.message);
    return null;
  }
  return data.signedUrl;
}

/** Converte o `<canvas>` capturado em `Blob` PNG — mecanismo de captura
 * (contrato pede pra documentar): `toDataURL` + `fetch` do data URL, em vez
 * de `canvas.toBlob(callback)`, pra poder ser `await`ado linearmente. */
export async function canvasParaBlobPng(canvas: HTMLCanvasElement): Promise<Blob> {
  const dataUrl = canvas.toDataURL("image/png");
  const resposta = await fetch(dataUrl);
  return resposta.blob();
}
