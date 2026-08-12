import { createClient } from "@/lib/supabase/client";

// Task 4.8-4.9-back (contrato .maestro/state/contracts/4.8-4.9-back.md) —
// client-side (browser Supabase client, `lib/supabase/client.ts`) porque o
// upload em si roda direto do dropzone da UI (Task 4.8-4.9 front, fora de
// escopo aqui), autenticado, protegido pela RLS do bucket privado
// `organizacao-logos` (migration
// `supabase/migrations/20260812130418_storage_organizacao_logos.sql`) — sem
// precisar de Server Action, mesmo padrão de
// `lib/linha-proposta/storage.ts`.
//
// Decisão de leitura (bucket PRIVADO): `organizacao.logo_url` guarda o PATH
// do objeto (`{organizacao_id}/logo.<ext>`), NUNCA uma URL assinada — uma
// signed URL expira (`createSignedUrl` abaixo usa 1h), e persistir uma URL
// que expira geraria logos quebradas depois de algum tempo. A UI resolve o
// path pra uma signed URL sob demanda, no momento de exibir.
export const BUCKET_ORGANIZACAO_LOGOS = "organizacao-logos";

const EXTENSAO_POR_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Mime types aceitos pelo bucket (réplica de `allowed_mime_types` da
 * migration) — sem SVG, prevenção de XSS embutido em SVG servido como
 * imagem. */
export const MIME_TYPES_LOGO_ACEITOS = Object.keys(EXTENSAO_POR_MIME);

export function pathLogoOrganizacao(organizacaoId: string, mimeType: string): string {
  const extensao = EXTENSAO_POR_MIME[mimeType];
  if (!extensao) {
    throw new Error(`Tipo de arquivo não suportado para logo: ${mimeType}`);
  }
  return `${organizacaoId}/logo.${extensao}`;
}

export type ResultadoUploadLogo = { ok: true; path: string } | { ok: false; erro: string };

/** Faz upload da logo pro bucket privado. `upsert: true` porque o path é
 * determinístico por organização (`{organizacaoId}/logo.<ext>`) — uma nova
 * logo SUBSTITUI a anterior, nunca acumula arquivo órfão. */
export async function uploadLogoOrganizacao(organizacaoId: string, arquivo: Blob): Promise<ResultadoUploadLogo> {
  const supabase = createClient();
  let path: string;
  try {
    path = pathLogoOrganizacao(organizacaoId, arquivo.type);
  } catch {
    return { ok: false, erro: "Formato de imagem não suportado. Use PNG, JPEG ou WEBP." };
  }
  const { error } = await supabase.storage.from(BUCKET_ORGANIZACAO_LOGOS).upload(path, arquivo, {
    upsert: true,
    contentType: arquivo.type,
  });
  if (error) {
    console.error("[organizacao] falha ao subir logo:", error.message);
    return { ok: false, erro: "Não foi possível salvar a logo. Tente novamente." };
  }
  return { ok: true, path };
}

/** Resolve um path do bucket privado pra uma URL assinada temporária (1h) —
 * chamado sob demanda pela UI que exibe a logo (nunca persistido). */
export async function obterUrlAssinadaLogoOrganizacao(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET_ORGANIZACAO_LOGOS).createSignedUrl(path, 3600);
  if (error || !data) {
    console.error("[organizacao] falha ao gerar URL assinada da logo:", error?.message);
    return null;
  }
  return data.signedUrl;
}
