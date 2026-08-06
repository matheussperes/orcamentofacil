import { idDoItem, type ModuloOrcamento } from "@/lib/orcamento";
import type { AlturasFaixas, ItemPosicionado } from "@/lib/engine/parede/types";

// Movido de `acoes.ts` (Server Actions build fix): um módulo `"use server"`
// exige que TODO export seja async — estas duas são funções puras (sem I/O),
// testáveis sem mockar o client do Supabase, e não são Server Actions em si.
// Ficavam sem quebrar o build enquanto `acoes.ts` nunca era importado por
// nenhum Client Component; `lib/ambiente/mutar.ts` (consumido por
// `AmbientesTabConectada`) passou a importar `acoes.ts`, puxando-o para a
// análise de bundle do cliente e expondo a violação.

// Achado 1 (Security-Decline-Payload.md, tentativa 1): `alturasOverride`
// chega como `Partial<AlturasFaixas>` só em tipo — TypeScript não protege em
// runtime (Server Action = endpoint HTTP público). Whitelist de chave +
// validação de valor antes de gravar em `parede.alturas_override` (jsonb sem
// shape formal no banco).
const CHAVES_ALTURAS_FAIXAS = new Set<keyof AlturasFaixas>([
  "alturaRodape",
  "alturaBancada",
  "alturaInstalacaoAereo",
  "peDireito",
]);
const ALTURA_MAX_MM = 6000; // teto de faixa residencial — cobre pé-direito duplo, barra blob arbitrário

export function sanearAlturasOverride(
  entrada: Partial<AlturasFaixas>
): { ok: true; valor: Partial<AlturasFaixas> } | { ok: false; erro: string } {
  const valor: Partial<AlturasFaixas> = {};
  for (const chave of Object.keys(entrada) as (keyof AlturasFaixas)[]) {
    if (!CHAVES_ALTURAS_FAIXAS.has(chave)) continue; // descarta chave fora do shape
    const v = entrada[chave];
    if (typeof v !== "number" || !Number.isFinite(v) || !(v > 0) || v > ALTURA_MAX_MM) {
      return { ok: false, erro: "Altura inválida em alturas_override." };
    }
    valor[chave] = v;
  }
  return { ok: true, valor };
}

// ---------------------------------------------------------------------------
// Cascata órfã (ponto de atenção real, sem FK que garanta): excluir um
// ambiente ou uma parede pode deixar `itemId` de `orcamento.itens`
// (ModuloOrcamento[]) sem nenhum `ItemPosicionado` que o referencie em
// nenhuma parede restante do orçamento. Função PURA (sem I/O), testável sem
// mockar o client do Supabase — mesmo espírito de `lib/ambiente/mapear.ts`
// (o projeto não tem infraestrutura de mock do client Supabase ainda).
// ---------------------------------------------------------------------------
export function itensSemOrfaos(
  modulos: ModuloOrcamento[],
  itensPorParedeRestante: ItemPosicionado[][]
): ModuloOrcamento[] {
  const referenciados = new Set(itensPorParedeRestante.flat().map((item) => item.itemId));
  return modulos.filter((modulo) => referenciados.has(idDoItem(modulo)));
}
