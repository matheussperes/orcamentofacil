import type { ItemQtd, Peca } from "../types";
import type { BayNode, BoxMaterial, BoxModule, CarcassType } from "./types";

// Explosão geométrica recursiva da caixa (V3). Funções puras: dado um BoxModule,
// devolve a lista de peças (Peca) + ferragens. Reaproveita o tipo Peca para
// alimentar a mesma consolidação/custo do motor de templates.

const RECUO_DIVISORIA = 20; // recuo frontal de divisórias/prateleiras (mm)
const TRAVESSA_H = 70; // altura da travessa do módulo inferior (mm)
const RODAPE_H = 100;
const FOLGA_PORTA = 3;
const FOLGA_PORTA_V = 4;
const TAMPONAMENTO_EXTRA = 25; // 2,5cm maior que a profundidade
const SARRAFO_LARGURA = 80;
const GAVETA_LATERAL_H = 120;
const GAVETA_CAIXOTE_H = 100;
const GAVETA_FUNDO_ESP = 6;
const AFASTADOR = 30;

export interface BoxResult {
  pecas: Peca[];
  ferragens: ItemQtd[];
  areaMdfM2: number;
  fitaM: number;
}

interface Ctx {
  pecas: Peca[];
  ferragens: Map<string, number>;
  caixa: BoxMaterial;
  altura: number; // altura total do módulo (p/ tamponamento lateral)
}

function addFerragem(ctx: Ctx, item: string, q: number) {
  if (q > 0) ctx.ferragens.set(item, (ctx.ferragens.get(item) ?? 0) + q);
}

function push(
  ctx: Ctx,
  nome: string,
  quantidade: number,
  material: BoxMaterial,
  materialTipo: Peca["material_tipo"],
  altura: number,
  largura: number,
  fitaAltura: number,
  fitaLargura: number
) {
  if (quantidade <= 0 || altura <= 0 || largura <= 0) return;
  ctx.pecas.push({
    nome,
    quantidade,
    material_tipo: materialTipo,
    cor: material.cor,
    espessura_mm: material.espessura,
    altura_mm: Math.round(altura),
    largura_mm: Math.round(largura),
    area_m2: round4((altura * largura * quantidade) / 1e6),
    fita_m: round4(((fitaAltura * altura + fitaLargura * largura) * quantidade) / 1000),
  });
}

/** Carcaça estrutural conforme o tipo (aéreo/inferior/torre). */
function gerarCarcaca(ctx: Ctx, box: BoxModule) {
  const { caixa } = ctx;
  const t = caixa.espessura;
  const larguraInterna = box.largura - 2 * t;

  // Laterais (sempre inteiriças).
  push(ctx, "Lateral", 2, caixa, "caixa", box.altura, box.profundidade, 1, 0);
  // Base (sempre inteiriça).
  push(ctx, "Base", 1, caixa, "caixa", box.profundidade, larguraInterna, 0, 1);

  if (box.tipo === "inferior") {
    // Topo = 2 travessas de 70mm; sem tampo inteiriço.
    push(ctx, "Travessa Superior Frontal", 1, caixa, "caixa", TRAVESSA_H, larguraInterna, 0, 1);
    push(ctx, "Travessa Superior Traseira", 1, caixa, "caixa", TRAVESSA_H, larguraInterna, 0, 1);
  } else {
    push(ctx, "Tampo", 1, caixa, "caixa", box.profundidade, larguraInterna, 0, 1);
  }
  if (box.tipo === "torre") {
    push(ctx, "Rodapé Frontal", 1, caixa, "caixa", RODAPE_H, larguraInterna, 0, 1);
  }
}

/** Explode um vão (recursivo). W×H×D são as dimensões internas do vão. */
function explodeVao(ctx: Ctx, node: BayNode, W: number, H: number, D: number) {
  const t = ctx.caixa.espessura;

  if (node.split === "vertical" && node.qtdDivisorias > 0) {
    // Divisórias verticais (painéis) + sub-vãos lado a lado.
    push(ctx, "Divisória Vertical", node.qtdDivisorias, ctx.caixa, "caixa", H, D - RECUO_DIVISORIA, 1, 0);
    const bays = node.qtdDivisorias + 1;
    const childW = (W - node.qtdDivisorias * t) / bays;
    const filhos = node.children ?? [];
    for (let i = 0; i < bays; i++) {
      if (filhos[i]) explodeVao(ctx, filhos[i], childW, H, D);
    }
    return;
  }

  if (node.split === "horizontal" && node.qtdDivisorias > 0) {
    // Divisórias horizontais (prateleiras estruturais) + sub-vãos empilhados.
    push(ctx, "Divisória Horizontal", node.qtdDivisorias, ctx.caixa, "caixa", D - RECUO_DIVISORIA, W, 0, 1);
    const bays = node.qtdDivisorias + 1;
    const childH = (H - node.qtdDivisorias * t) / bays;
    const filhos = node.children ?? [];
    for (let i = 0; i < bays; i++) {
      if (filhos[i]) explodeVao(ctx, filhos[i], W, childH, D);
    }
    return;
  }

  // Vão-folha: aplica o conteúdo.
  aplicarConteudo(ctx, node, W, H, D);
}

function aplicarConteudo(ctx: Ctx, node: BayNode, W: number, H: number, D: number) {
  const c = node.content;
  if (!c || c.tipo === "vazio") return;

  switch (c.tipo) {
    case "portas": {
      const larguraPorta = W / c.qtd - FOLGA_PORTA;
      const alturaPorta = H - FOLGA_PORTA_V;
      push(ctx, "Porta", c.qtd, c.material, "frente", alturaPorta, larguraPorta, 2, 2);
      c.sentidos.slice(0, c.qtd).forEach((s) => {
        if (s === "basculante") {
          addFerragem(ctx, "pistao", 1);
          addFerragem(ctx, "dobradica_35", 2);
        } else {
          addFerragem(ctx, "dobradica_35", Math.max(2, Math.ceil(alturaPorta / 450)));
        }
        if (s !== "cava") addFerragem(ctx, "puxador", 1);
      });
      break;
    }
    case "prateleira": {
      push(ctx, "Prateleira", c.qtd, ctx.caixa, "prateleira", D - c.recuo, W - 2, 0, 1);
      break;
    }
    case "fundo": {
      push(ctx, "Fundo", 1, { cor: ctx.caixa.cor, espessura: c.espessura }, "fundo", H, W, 0, 0);
      break;
    }
    case "tamponamento": {
      const profundidade = D + TAMPONAMENTO_EXTRA;
      const ehLateral = c.lado === "direito" || c.lado === "esquerdo";
      const comp = ehLateral ? ctx.altura : W;
      if (c.sarrafo) {
        // Quadro de sarrafos de 80mm.
        push(ctx, `Sarrafo tamponamento (${c.lado})`, 2, c.material, "frente", comp, SARRAFO_LARGURA, 0, 0);
        push(ctx, `Sarrafo tamponamento (${c.lado})`, 2, c.material, "frente", profundidade - 2 * SARRAFO_LARGURA, SARRAFO_LARGURA, 0, 0);
      } else {
        push(ctx, `Tamponamento ${c.lado}`, 1, c.material, "frente", comp, profundidade, 1, 0);
      }
      break;
    }
    case "gaveta": {
      const alturaFrente = H / c.qtd - FOLGA_PORTA;
      const larguraFrente = W - FOLGA_PORTA;
      if (c.interna) {
        // Frente interna = cor da caixa; + montante interno do guarda-roupa.
        push(ctx, "Frente Gaveta Interna", c.qtd, ctx.caixa, "caixa", alturaFrente, larguraFrente, 2, 2);
        push(ctx, "Lateral Montante", 2, ctx.caixa, "caixa", H, D - 100, 1, 0);
        push(ctx, "Travessa Montante", 2, ctx.caixa, "caixa", 100, W - 2 * ctx.caixa.espessura, 0, 1);
        push(ctx, "Afastador Montante", 2, ctx.caixa, "caixa", H, AFASTADOR, 0, 0);
      } else {
        const material: BoxMaterial = {
          cor: c.corFrente ?? ctx.caixa.cor,
          espessura: c.espessuraFrente ?? 18,
        };
        push(ctx, "Frente Gaveta Externa", c.qtd, material, "frente", alturaFrente, larguraFrente, 2, 2);
        addFerragem(ctx, "puxador", c.qtd);
      }
      // Caixote da gaveta (comum às duas).
      push(ctx, "Lateral de Gaveta", c.qtd * 2, ctx.caixa, "caixa", GAVETA_LATERAL_H, c.profundidade, 0, 1);
      push(ctx, "Frente/Contrafrente Gaveta", c.qtd * 2, ctx.caixa, "caixa", GAVETA_CAIXOTE_H, W - 50, 0, 1);
      push(ctx, "Fundo de Gaveta", c.qtd, { cor: ctx.caixa.cor, espessura: GAVETA_FUNDO_ESP }, "fundo", c.profundidade, W - 35, 0, 0);
      addFerragem(ctx, "corredica_par", c.qtd);
      break;
    }
  }
}

/**
 * Tamponamento de INSTÂNCIA (doc 12): painéis colados por fora da carcaça já
 * pronta, um por lado ativado. Não altera as peças internas da caixa — soma
 * apenas ao consumo de material (a largura de instalação é somada à parte,
 * ver `larguraInstalacaoBox`).
 */
function gerarTamponamentoInstancia(ctx: Ctx, box: BoxModule) {
  const t = box.tamponamento;
  if (!t) return;

  const lados: { ativo: boolean; lado: string; comp: number }[] = [
    { ativo: t.esquerdo, lado: "esquerdo", comp: box.altura },
    { ativo: t.direito, lado: "direito", comp: box.altura },
    { ativo: t.superior, lado: "superior", comp: box.largura },
    { ativo: t.inferior, lado: "inferior", comp: box.largura },
  ];

  const profundidade = box.profundidade + TAMPONAMENTO_EXTRA;
  for (const l of lados) {
    if (!l.ativo) continue;
    if (t.sarrafo) {
      push(ctx, `Sarrafo tamponamento (${l.lado})`, 2, t.material, "frente", l.comp, SARRAFO_LARGURA, 0, 0);
      push(ctx, `Sarrafo tamponamento (${l.lado})`, 2, t.material, "frente", profundidade - 2 * SARRAFO_LARGURA, SARRAFO_LARGURA, 0, 0);
    } else {
      push(ctx, `Tamponamento ${l.lado}`, 1, t.material, "frente", l.comp, profundidade, 1, 0);
    }
  }
}

export function explodeBox(box: BoxModule): BoxResult {
  const ctx: Ctx = {
    pecas: [],
    ferragens: new Map(),
    caixa: box.caixa,
    altura: box.altura,
  };
  const t = box.caixa.espessura;

  gerarCarcaca(ctx, box);

  const interiorW = box.largura - 2 * t;
  const interiorD = box.profundidade;
  const interiorH =
    box.tipo === "inferior" ? box.altura - t - TRAVESSA_H : box.altura - 2 * t;

  explodeVao(ctx, box.raiz, interiorW, interiorH, interiorD);
  gerarTamponamentoInstancia(ctx, box);

  const areaMdfM2 = round4(ctx.pecas.reduce((s, p) => s + p.area_m2, 0));
  const fitaM = round4(ctx.pecas.reduce((s, p) => s + p.fita_m, 0));
  const ferragens: ItemQtd[] = [...ctx.ferragens.entries()]
    .map(([item, quantidade]) => ({ item, quantidade }))
    .sort((a, b) => a.item.localeCompare(b.item));

  return { pecas: ctx.pecas, ferragens, areaMdfM2, fitaM };
}

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
