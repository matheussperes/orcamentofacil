import type { BoxModule } from "./engine/box/types";

// Presets de módulo salvos pelo usuário (V3): ele monta uma caixa uma vez,
// salva, e depois só seleciona na hora de criar o módulo. localStorage no MVP;
// migra para a tabela ModuloTemplate quando o banco entrar.

const CHAVE = "boxPresets";

export interface BoxPreset {
  id: string;
  nome: string;
  box: BoxModule; // molde (as medidas podem ser ajustadas ao aplicar)
}

export function listarPresets(): BoxPreset[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]");
  } catch {
    return [];
  }
}

export function salvarPreset(nome: string, box: BoxModule): BoxPreset {
  const presets = listarPresets();
  const preset: BoxPreset = {
    id: "preset-" + Math.random().toString(36).slice(2, 9),
    nome,
    box,
  };
  presets.push(preset);
  window.localStorage.setItem(CHAVE, JSON.stringify(presets));
  return preset;
}

export function removerPreset(id: string): void {
  const presets = listarPresets().filter((p) => p.id !== id);
  window.localStorage.setItem(CHAVE, JSON.stringify(presets));
}
