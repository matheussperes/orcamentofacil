import type { ModuloTemplate } from "./engine/types";
import { listarTemplates } from "./engine/templates";

// V2-4 — Overrides de template do configurador de engenharia. Persistem no
// localStorage (MVP) e são enviados ao motor via o campo `templates` da
// requisição de cálculo, sem alterar o código do motor.

const CHAVE = "templateOverrides";

export function carregarOverrides(): Record<string, ModuloTemplate> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE) ?? "{}");
  } catch {
    return {};
  }
}

export function salvarOverride(t: ModuloTemplate): void {
  const all = carregarOverrides();
  all[t.codigo] = t;
  window.localStorage.setItem(CHAVE, JSON.stringify(all));
}

export function removerOverride(codigo: string): void {
  const all = carregarOverrides();
  delete all[codigo];
  window.localStorage.setItem(CHAVE, JSON.stringify(all));
}

/** Template efetivo: override do usuário, se houver; senão o da biblioteca. */
export function templateEfetivo(codigo: string): ModuloTemplate {
  const base = listarTemplates().find((t) => t.codigo === codigo)!;
  return carregarOverrides()[codigo] ?? base;
}
