import { createClient } from "@/lib/supabase/client";

// Task 4.11-back (contrato .maestro/state/contracts/4.11-back.md) —
// réplica de `lib/organizacao/logo-storage.ts`, com uma diferença de
// escopo: a foto é posse INDIVIDUAL do usuário (`{perfil_id}/foto.<ext>`,
// onde `perfil_id` = `auth.uid()`), não da organização — protegida pela RLS
// do bucket privado `perfil-fotos` (migration
// `supabase/migrations/20260813140434_perfil_foto_url_storage.sql`), que
// escopa por `auth.uid()`, não por `private.org_do_usuario()`.
//
// Decisão de leitura (bucket PRIVADO): `perfil.foto_url` guarda o PATH do
// objeto, NUNCA uma URL assinada — uma signed URL expira (`createSignedUrl`
// abaixo usa 1h). A UI resolve o path pra uma signed URL sob demanda, no
// momento de exibir.
export const BUCKET_PERFIL_FOTOS = "perfil-fotos";

const EXTENSAO_POR_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Mime types aceitos pelo bucket (réplica de `allowed_mime_types` da
 * migration) — sem SVG, prevenção de XSS embutido em SVG servido como
 * imagem. */
export const MIME_TYPES_FOTO_ACEITOS = Object.keys(EXTENSAO_POR_MIME);

export function pathFotoPerfil(perfilId: string, mimeType: string): string {
  const extensao = EXTENSAO_POR_MIME[mimeType];
  if (!extensao) {
    throw new Error(`Tipo de arquivo não suportado para foto de perfil: ${mimeType}`);
  }
  return `${perfilId}/foto.${extensao}`;
}

export type ResultadoUploadFotoPerfil = { ok: true; path: string } | { ok: false; erro: string };

/** Faz upload da foto pro bucket privado. `upsert: true` porque o path é
 * determinístico por usuário (`{perfilId}/foto.<ext>`) — uma nova foto
 * SUBSTITUI a anterior, nunca acumula arquivo órfão. */
export async function uploadFotoPerfil(perfilId: string, arquivo: Blob): Promise<ResultadoUploadFotoPerfil> {
  const supabase = createClient();
  let path: string;
  try {
    path = pathFotoPerfil(perfilId, arquivo.type);
  } catch {
    return { ok: false, erro: "Formato de imagem não suportado. Use PNG, JPEG ou WEBP." };
  }
  const { error } = await supabase.storage.from(BUCKET_PERFIL_FOTOS).upload(path, arquivo, {
    upsert: true,
    contentType: arquivo.type,
  });
  if (error) {
    console.error("[perfil] falha ao subir foto de perfil:", error.message);
    return { ok: false, erro: "Não foi possível salvar a foto. Tente novamente." };
  }
  return { ok: true, path };
}

/** Resolve um path do bucket privado pra uma URL assinada temporária (1h) —
 * chamado sob demanda pela UI que exibe a foto (nunca persistido). */
export async function obterUrlAssinadaFotoPerfil(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET_PERFIL_FOTOS).createSignedUrl(path, 3600);
  if (error || !data) {
    console.error("[perfil] falha ao gerar URL assinada da foto de perfil:", error?.message);
    return null;
  }
  return data.signedUrl;
}
