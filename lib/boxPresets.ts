import type { BayNode, FrenteConteudo } from "./engine/box/types";
import type { BoxModule } from "./engine/box/types";

// Presets de módulo salvos pelo usuário (V3): ele monta uma caixa uma vez no
// Laboratório (/modulo), salva com uma categoria/ambiente, e depois só
// seleciona (Ambiente → Tipo → Modelo) na hora de criar o módulo no
// orçamento. localStorage no MVP; migra para a tabela ModuloTemplate quando
// o banco entrar. Os presets salvos SÃO a base de módulos disponíveis — o
// editor é a fonte da verdade.

const CHAVE = "boxPresets";
const CHAVE_SEED = "boxPresets_seeded_v2";

export interface BoxPreset {
  id: string;
  nome: string;
  categoria: string;
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

export function salvarPreset(
  nome: string,
  categoria: string,
  box: BoxModule
): BoxPreset {
  const presets = listarPresets();
  const preset: BoxPreset = {
    id: "preset-" + Math.random().toString(36).slice(2, 9),
    nome,
    categoria,
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

/** Vão-folha "espaço": frente + prateleiras + fundo são independentes e
 * combináveis (ex.: portas na frente + prateleiras internas + fundo). */
function espaco(
  id: string,
  frente: FrenteConteudo,
  opts: { prateleiras?: { qtd: number; recuo: number }; fundo?: { espessura: number } } = {}
): BayNode {
  return {
    id,
    split: "none",
    qtdDivisorias: 0,
    content: { tipo: "espaco", frente, prateleiras: opts.prateleiras, fundo: opts.fundo },
  };
}

// Conjunto inicial de presets (Fase 3, Etapa 2): dá conteúdo real ao fluxo
// Ambiente → Tipo → Modelo desde o primeiro uso, sem exigir que o usuário
// construa tudo do zero no laboratório antes de montar o primeiro orçamento.
// São presets editáveis/excluíveis como qualquer outro.
function presetsSeed(): Omit<BoxPreset, "id">[] {
  return [
    {
      nome: "Balcão 2 Portas",
      categoria: "Cozinha",
      box: {
        id: "seed", nome: "Balcão 2 Portas", tipo: "inferior",
        largura: 800, altura: 720, profundidade: 550,
        caixa: { cor: "Branco TX", espessura: 15 },
        // Portas + 1 prateleira interna + fundo — mostra que não precisam
        // dividir o vão para coexistir.
        raiz: espaco(
          "raiz-1",
          { tipo: "portas", qtd: 2, sentidos: ["esquerda", "direita"], material: { cor: "Louro Freijó", espessura: 18 } },
          { prateleiras: { qtd: 1, recuo: 20 }, fundo: { espessura: 6 } }
        ),
      },
    },
    {
      nome: "Gaveteiro 4 Gavetas",
      categoria: "Cozinha",
      box: {
        id: "seed", nome: "Gaveteiro 4 Gavetas", tipo: "inferior",
        largura: 450, altura: 720, profundidade: 550,
        caixa: { cor: "Branco TX", espessura: 15 },
        raiz: espaco("raiz-2", {
          tipo: "gaveta", qtd: 4, profundidade: 500, interna: false,
          corFrente: "Louro Freijó", espessuraFrente: 18,
        }),
      },
    },
    {
      nome: "Aéreo 2 Portas",
      categoria: "Cozinha",
      box: {
        id: "seed", nome: "Aéreo 2 Portas", tipo: "aereo",
        largura: 800, altura: 700, profundidade: 350,
        caixa: { cor: "Branco TX", espessura: 15 },
        raiz: espaco(
          "raiz-3",
          { tipo: "portas", qtd: 2, sentidos: ["esquerda", "direita"], material: { cor: "Louro Freijó", espessura: 18 } },
          { prateleiras: { qtd: 1, recuo: 20 }, fundo: { espessura: 6 } }
        ),
      },
    },
    {
      nome: "Torre Quente Basculante + Portas",
      categoria: "Cozinha",
      box: {
        id: "seed", nome: "Torre Quente Basculante + Portas", tipo: "torre",
        largura: 700, altura: 2200, profundidade: 600,
        caixa: { cor: "Branco TX", espessura: 15 },
        raiz: {
          id: "raiz-4", split: "horizontal", qtdDivisorias: 1,
          children: [
            espaco("raiz-4-a", { tipo: "portas", qtd: 1, sentidos: ["basculante"], material: { cor: "Louro Freijó", espessura: 18 } }),
            espaco(
              "raiz-4-b",
              { tipo: "portas", qtd: 2, sentidos: ["esquerda", "direita"], material: { cor: "Louro Freijó", espessura: 18 } },
              { prateleiras: { qtd: 2, recuo: 20 }, fundo: { espessura: 6 } }
            ),
          ],
        },
      },
    },
    {
      nome: "Guarda-roupa 2 Portas",
      categoria: "Quarto",
      box: {
        id: "seed", nome: "Guarda-roupa 2 Portas", tipo: "torre",
        largura: 900, altura: 2400, profundidade: 600,
        caixa: { cor: "Branco TX", espessura: 15 },
        raiz: espaco(
          "raiz-5",
          { tipo: "portas", qtd: 2, sentidos: ["esquerda", "direita"], material: { cor: "Branco TX", espessura: 18 } },
          { prateleiras: { qtd: 3, recuo: 20 }, fundo: { espessura: 6 } }
        ),
      },
    },
    {
      nome: "Guarda-roupa Gaveteiro Interno",
      categoria: "Quarto",
      box: {
        id: "seed", nome: "Guarda-roupa Gaveteiro Interno", tipo: "torre",
        largura: 900, altura: 2400, profundidade: 600,
        caixa: { cor: "Branco TX", espessura: 15 },
        raiz: {
          id: "raiz-6", split: "horizontal", qtdDivisorias: 1,
          children: [
            espaco(
              "raiz-6-a",
              { tipo: "portas", qtd: 2, sentidos: ["esquerda", "direita"], material: { cor: "Branco TX", espessura: 18 } },
              { prateleiras: { qtd: 2, recuo: 20 }, fundo: { espessura: 6 } }
            ),
            espaco("raiz-6-b", { tipo: "gaveta", qtd: 3, profundidade: 500, interna: true }, { fundo: { espessura: 6 } }),
          ],
        },
      },
    },
  ];
}

/** Semeia presets padrão apenas na primeira visita (não reaparecem se apagados). */
export function seedPresetsPadrao(): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem(CHAVE_SEED)) return;
  window.localStorage.setItem(CHAVE_SEED, "1");
  if (listarPresets().length > 0) return;

  const presets: BoxPreset[] = presetsSeed().map((p) => ({
    ...p,
    id: "preset-" + Math.random().toString(36).slice(2, 9),
    box: { ...p.box, id: "preset-" + Math.random().toString(36).slice(2, 9) },
  }));
  window.localStorage.setItem(CHAVE, JSON.stringify(presets));
}
