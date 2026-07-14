// Categorias/ambientes dos módulos (Fase 3, Etapa 2 — doc 12), usadas para
// classificar os presets salvos no editor de caixa. Persistidas no
// localStorage; a lista padrão cobre os ambientes mais comuns.

const CHAVE = "categorias";

const CATEGORIAS_PADRAO = [
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
