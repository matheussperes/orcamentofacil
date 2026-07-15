import type { BayNode, FrenteConteudo, GrupoPortas } from "./engine/box/types";
import type { BoxModule } from "./engine/box/types";
import { migrarBoxModule } from "./engine/box/migrate";

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

/**
 * Lê os presets migrando qualquer um salvo no formato antigo de BayContent
 * (doc 13) — sem isso, um preset salvo antes da refatoração quebra a
 * aplicação ao ser instanciado. Autocorrige o localStorage na primeira
 * leitura (write-back) para não precisar migrar de novo a cada chamada.
 */
export function listarPresets(): BoxPreset[] {
  if (typeof window === "undefined") return [];
  let brutos: BoxPreset[];
  try {
    brutos = JSON.parse(window.localStorage.getItem(CHAVE) ?? "[]");
  } catch {
    return [];
  }

  let mudou = false;
  const migrados = brutos.map((p) => {
    const antes = JSON.stringify(p.box);
    const box = migrarBoxModule(p.box);
    if (JSON.stringify(box) !== antes) mudou = true;
    return { ...p, box };
  });

  if (mudou) window.localStorage.setItem(CHAVE, JSON.stringify(migrados));
  return migrados;
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

/** Vão-folha "espaço": frente (vazio/gaveta) + prateleiras são independentes
 * e combináveis. Portas não entram aqui — são um `GrupoPortas` à parte (ver
 * `portas()`), e fundo é global (`box.temFundo`). */
function espaco(
  id: string,
  frente: FrenteConteudo,
  opts: { prateleiras?: { qtd: number; recuo: number } } = {}
): BayNode {
  return {
    id,
    split: "none",
    qtdDivisorias: 0,
    content: { tipo: "espaco", frente, prateleiras: opts.prateleiras },
  };
}

let contadorGrupoPortas = 0;

/** Grupo de porta cobrindo um único vão (uso nos seeds — cobertura de
 * múltiplos vãos/caixa inteira é montada pelo usuário no laboratório). */
function portas(
  vaoId: string,
  opts: { qtd: number; sentido: GrupoPortas["sentido"]; tipoAbertura?: GrupoPortas["tipoAbertura"]; material: BoxMaterialLocal }
): GrupoPortas {
  contadorGrupoPortas += 1;
  return {
    id: `seed-porta-${contadorGrupoPortas}`,
    alvo: { tipo: "vaos", vaoIds: [vaoId] },
    tipoAbertura: opts.tipoAbertura ?? "abrir",
    sentido: opts.sentido,
    qtd: opts.qtd,
    material: opts.material,
  };
}

type BoxMaterialLocal = { cor: string; espessura: number };

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
        temFundo: true,
        puxador: "haste",
        // 1 prateleira interna + porta cobrindo o vão inteiro — mostra que
        // não precisam dividir o vão para coexistir.
        raiz: espaco("raiz-1", { tipo: "vazio" }, { prateleiras: { qtd: 1, recuo: 20 } }),
        portas: [portas("raiz-1", { qtd: 2, sentido: "direita", material: { cor: "Louro Freijó", espessura: 18 } })],
      },
    },
    {
      nome: "Gaveteiro 4 Gavetas",
      categoria: "Cozinha",
      box: {
        id: "seed", nome: "Gaveteiro 4 Gavetas", tipo: "inferior",
        largura: 450, altura: 720, profundidade: 550,
        caixa: { cor: "Branco TX", espessura: 15 },
        temFundo: false,
        puxador: "haste",
        raiz: espaco("raiz-2", {
          tipo: "gaveta", qtd: 4, profundidade: 500, interna: false,
          corFrente: "Louro Freijó", espessuraFrente: 18,
        }),
        portas: [],
      },
    },
    {
      nome: "Aéreo 2 Portas",
      categoria: "Cozinha",
      box: {
        id: "seed", nome: "Aéreo 2 Portas", tipo: "aereo",
        largura: 800, altura: 700, profundidade: 350,
        caixa: { cor: "Branco TX", espessura: 15 },
        temFundo: true,
        puxador: "haste",
        raiz: espaco("raiz-3", { tipo: "vazio" }, { prateleiras: { qtd: 1, recuo: 20 } }),
        portas: [portas("raiz-3", { qtd: 2, sentido: "direita", material: { cor: "Louro Freijó", espessura: 18 } })],
      },
    },
    {
      nome: "Torre Quente Basculante + Portas",
      categoria: "Cozinha",
      box: {
        id: "seed", nome: "Torre Quente Basculante + Portas", tipo: "torre",
        largura: 700, altura: 2200, profundidade: 600,
        caixa: { cor: "Branco TX", espessura: 15 },
        temFundo: true,
        puxador: "haste",
        raiz: {
          id: "raiz-4", split: "horizontal", qtdDivisorias: 1, recuoFrontal: 20, posicao: "centralizado",
          children: [
            espaco("raiz-4-a", { tipo: "vazio" }),
            espaco("raiz-4-b", { tipo: "vazio" }, { prateleiras: { qtd: 2, recuo: 20 } }),
          ],
        },
        portas: [
          portas("raiz-4-a", { qtd: 1, sentido: "basculante_pia", material: { cor: "Louro Freijó", espessura: 18 } }),
          portas("raiz-4-b", { qtd: 2, sentido: "direita", material: { cor: "Louro Freijó", espessura: 18 } }),
        ],
      },
    },
    {
      nome: "Guarda-roupa 2 Portas",
      categoria: "Quarto",
      box: {
        id: "seed", nome: "Guarda-roupa 2 Portas", tipo: "torre",
        largura: 900, altura: 2400, profundidade: 600,
        caixa: { cor: "Branco TX", espessura: 15 },
        temFundo: true,
        puxador: "haste",
        raiz: espaco("raiz-5", { tipo: "vazio" }, { prateleiras: { qtd: 3, recuo: 20 } }),
        portas: [portas("raiz-5", { qtd: 2, sentido: "direita", material: { cor: "Branco TX", espessura: 18 } })],
      },
    },
    {
      nome: "Guarda-roupa Gaveteiro Interno",
      categoria: "Quarto",
      box: {
        id: "seed", nome: "Guarda-roupa Gaveteiro Interno", tipo: "torre",
        largura: 900, altura: 2400, profundidade: 600,
        caixa: { cor: "Branco TX", espessura: 15 },
        temFundo: true,
        puxador: "haste",
        raiz: {
          id: "raiz-6", split: "horizontal", qtdDivisorias: 1, recuoFrontal: 20, posicao: "centralizado",
          children: [
            espaco("raiz-6-a", { tipo: "vazio" }, { prateleiras: { qtd: 2, recuo: 20 } }),
            espaco("raiz-6-b", { tipo: "gaveta", qtd: 3, profundidade: 500, interna: true }),
          ],
        },
        portas: [portas("raiz-6-a", { qtd: 2, sentido: "direita", material: { cor: "Branco TX", espessura: 18 } })],
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
