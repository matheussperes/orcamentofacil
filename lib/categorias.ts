// Categorias/ambientes dos módulos (Fase 3, Etapa 2 — doc 12), usadas para
// classificar os presets salvos no editor de caixa. Persistidas no
// localStorage; a lista padrão cobre os ambientes mais comuns.

const CHAVE = "categorias";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — exportada: `/biblioteca`
// usa como sugestão inicial da lista de categorias do filtro (junto com os
// valores distintos de `gabarito.categoria`, sem CRUD de categoria próprio no
// schema — ver `components/biblioteca/GabaritoLab.tsx`).
export const CATEGORIAS_PADRAO = [
  "Cozinha",
  "Quarto",
  "Sala",
  "Banheiro",
  "Lavanderia",
  "Closet",
  "Home Office",
  "Área Gourmet",
];

export function listarCategorias(): string[] {
  if (typeof window === "undefined") return CATEGORIAS_PADRAO;
  try {
    const extras: string[] = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]");
    return [...new Set([...CATEGORIAS_PADRAO, ...extras])];
  } catch {
    return CATEGORIAS_PADRAO;
  }
}

export function adicionarCategoria(nome: string): void {
  const limpo = nome.trim();
  if (!limpo || typeof window === "undefined") return;
  const atuais = listarCategorias();
  if (atuais.includes(limpo)) return;
  const extras: string[] = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]");
  extras.push(limpo);
  window.localStorage.setItem(CHAVE, JSON.stringify(extras));
}

/** As 8 categorias padrão são fixas (não editáveis/removíveis) — só as
 * criadas pelo usuário (extras) podem ser renomeadas/removidas aqui. */
export function ehCategoriaPadrao(nome: string): boolean {
  return CATEGORIAS_PADRAO.includes(nome);
}

export function renomearCategoria(antigo: string, novo: string): void {
  const limpo = novo.trim();
  if (!limpo || typeof window === "undefined" || ehCategoriaPadrao(antigo)) return;
  const extras: string[] = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]");
  const i = extras.indexOf(antigo);
  if (i === -1) return;
  extras[i] = limpo;
  window.localStorage.setItem(CHAVE, JSON.stringify(extras));
}

export function removerCategoria(nome: string): void {
  if (typeof window === "undefined" || ehCategoriaPadrao(nome)) return;
  const extras: string[] = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]");
  window.localStorage.setItem(CHAVE, JSON.stringify(extras.filter((c) => c !== nome)));
}
