// Task R.3c — decomposição pura de `EditorItemNucleo.tsx` (1.003 linhas,
// acima do teto `maxUiFileLines: 400`). Funções puras (sem JSX, sem hooks)
// extraídas sem nenhuma mudança de comportamento.

import { vaoVazio, type BoxModule, type FrenteConteudo } from "@/lib/engine/box";
import type { Placa } from "@/lib/engine/placa/types";
import type { ConfigGaveta } from "./GavetasCard";

export function caixaInicial(cor: string, categoria: string): BoxModule {
  return {
    id: "box-1",
    nome: "Módulo novo",
    tipo: "inferior",
    categoria,
    largura: 800,
    altura: 720,
    profundidade: 550,
    caixa: { cor, espessura: 15 },
    raiz: vaoVazio("raiz"),
    portas: [],
    temFundo: true,
    puxador: "haste",
  };
}

// Task 13.1 — estado inicial de Placa, mesmo espírito de `caixaInicial`
// (id fixo "placa-1": o editor edita UM item por vez, igual ao box).
export function placaInicial(cor: string): Placa {
  return {
    id: "placa-1",
    nome: "Placa nova",
    largura: 600,
    altura: 400,
    material: { cor, espessura: 15 },
    orientacao: "horizontal",
  };
}

export function novoIdGrupoPortas(): string {
  return "porta-" + Math.random().toString(36).slice(2, 9);
}

export function idsIguais(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export function frenteDeGaveta(cfg: ConfigGaveta): FrenteConteudo {
  return cfg.interna
    ? { tipo: "gaveta", qtd: cfg.qtd, profundidade: cfg.profundidade, interna: true }
    : {
        tipo: "gaveta",
        qtd: cfg.qtd,
        profundidade: cfg.profundidade,
        interna: false,
        corFrente: cfg.cor,
        espessuraFrente: cfg.espessura,
      };
}

export const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
