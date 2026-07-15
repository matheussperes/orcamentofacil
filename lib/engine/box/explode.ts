import type { ItemQtd, Peca } from "../types";
import type { BayNode, BoxMaterial, BoxModule, TipoPuxador } from "./types";
import { retanguloVaos, tamanhosFilhos } from "./tree";

// Explosão geométrica recursiva da caixa (V3). Funções puras: dado um BoxModule,
// devolve a lista de peças (Peca) + ferragens. Reaproveita o tipo Peca para
// alimentar a mesma consolidação/custo do motor de templates.

const RECUO_DIVISORIA_PADRAO = 20; // fallback quando o nó não tem recuoFrontal (mm)
// Profundidade que a travessa avança para dentro do móvel (mm). A travessa é
// montada DEITADA, como a base — quem olha de frente vê só a espessura do
// MDF, não os 70mm. Por isso NÃO reduz a altura útil do vão (ver interiorH).
const TRAVESSA_PROFUNDIDADE = 70;
const RODAPE_H = 100;
const FOLGA_PORTA = 3;
const FOLGA_PORTA_V = 4;
const TAMPONAMENTO_EXTRA = 25; // 2,5cm maior que a profundidade
const SARRAFO_LARGURA = 80;
const GAVETA_LATERAL_H = 120;
const GAVETA_CAIXOTE_H = 100;
const GAVETA_FUNDO_ESP = 6;
const AFASTADOR = 30;
const FUNDO_ESP_PADRAO = 6; // espessura fixa do fundo quando box.temFundo = true

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
  temFundo: boolean;
  puxador: TipoPuxador;
  overridePortas?: BoxMaterial;
}

function addFerragem(ctx: Ctx, item: string, q: number) {
  if (q > 0) ctx.ferragens.set(item, (ctx.ferragens.get(item) ?? 0) + q);
}

/** Adiciona a ferragem de puxador de UMA frente, conforme `ctx.puxador`:
 * "haste" = 1 puxador (un.); "perfil" = `comprimentoMm` de perfil (m);
 * "sem_puxador" = nada. `comprimentoMm` é o comprimento da borda onde o
 * perfil correria (largura pra basculante/gaveta, altura pros demais). */
function addPuxador(ctx: Ctx, comprimentoMm: number) {
  if (ctx.puxador === "haste") addFerragem(ctx, "puxador", 1);
  else if (ctx.puxador === "perfil") addFerragem(ctx, "perfil_puxador_m", round4(comprimentoMm / 1000));
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
    // Topo = 2 travessas rasas (deitadas, como a base — ver TRAVESSA_PROFUNDIDADE),
    // não um tampo inteiriço. Cada travessa é uma tira de TRAVESSA_PROFUNDIDADE
    // de profundidade × larguraInterna, uma junto à frente, outra ao fundo.
    push(ctx, "Travessa Superior Frontal", 1, caixa, "caixa", TRAVESSA_PROFUNDIDADE, larguraInterna, 0, 1);
    push(ctx, "Travessa Superior Traseira", 1, caixa, "caixa", TRAVESSA_PROFUNDIDADE, larguraInterna, 0, 1);
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
    const recuo = node.recuoFrontal ?? RECUO_DIVISORIA_PADRAO;
    push(ctx, "Divisória Vertical", node.qtdDivisorias, ctx.caixa, "caixa", H, D - recuo, 1, 0);
    const larguras = tamanhosFilhos(node, W, t);
    const filhos = node.children ?? [];
    filhos.forEach((filho, i) => explodeVao(ctx, filho, larguras[i], H, D));
    return;
  }

  if (node.split === "horizontal" && node.qtdDivisorias > 0) {
    const recuo = node.recuoFrontal ?? RECUO_DIVISORIA_PADRAO;
    push(ctx, "Divisória Horizontal", node.qtdDivisorias, ctx.caixa, "caixa", D - recuo, W, 0, 1);
    const alturas = tamanhosFilhos(node, H, t);
    const filhos = node.children ?? [];
    filhos.forEach((filho, i) => explodeVao(ctx, filho, W, alturas[i], D));
    return;
  }

  // Vão-folha: aplica o conteúdo.
  aplicarConteudo(ctx, node, W, H, D);
}

function aplicarConteudo(ctx: Ctx, node: BayNode, W: number, H: number, D: number) {
  const c = node.content;
  if (!c) return;

  if (c.tipo === "tamponamento") {
    aplicarTamponamentoGabarito(ctx, c, W, D);
    return;
  }

  // c.tipo === "espaco": frente (vazio/gaveta) + prateleiras são
  // independentes e combináveis — portas ficam fora daqui (ver
  // aplicarGruposPortas), pois cobrem 1+ vãos ou a caixa inteira.
  aplicarFrente(ctx, c.frente, W, H, D);
  if (c.prateleiras && c.prateleiras.qtd > 0) {
    push(ctx, "Prateleira", c.prateleiras.qtd, ctx.caixa, "prateleira", D - c.prateleiras.recuo, W - 2, 0, 1);
  }
  if (ctx.temFundo) {
    push(ctx, "Fundo", 1, { cor: ctx.caixa.cor, espessura: FUNDO_ESP_PADRAO }, "fundo", H, W, 0, 0);
  }
}

function aplicarFrente(
  ctx: Ctx,
  frente: Extract<NonNullable<BayNode["content"]>, { tipo: "espaco" }>["frente"],
  W: number,
  H: number,
  D: number
) {
  switch (frente.tipo) {
    case "vazio":
      return;
    case "gaveta": {
      const alturaFrente = H / frente.qtd - FOLGA_PORTA;
      const larguraFrente = W - FOLGA_PORTA;
      if (frente.interna) {
        // Frente interna = cor da caixa; + montante interno do guarda-roupa.
        push(ctx, "Frente Gaveta Interna", frente.qtd, ctx.caixa, "caixa", alturaFrente, larguraFrente, 2, 2);
        push(ctx, "Lateral Montante", 2, ctx.caixa, "caixa", H, D - 100, 1, 0);
        push(ctx, "Travessa Montante", 2, ctx.caixa, "caixa", 100, W - 2 * ctx.caixa.espessura, 0, 1);
        push(ctx, "Afastador Montante", 2, ctx.caixa, "caixa", H, AFASTADOR, 0, 0);
      } else {
        const material: BoxMaterial = {
          cor: frente.corFrente ?? ctx.caixa.cor,
          espessura: frente.espessuraFrente ?? 18,
        };
        push(ctx, "Frente Gaveta Externa", frente.qtd, material, "frente", alturaFrente, larguraFrente, 2, 2);
        // Perfil de gaveta corre ao longo da borda superior da frente (largura).
        for (let i = 0; i < frente.qtd; i++) addPuxador(ctx, larguraFrente);
      }
      // Caixote da gaveta (comum às duas).
      push(ctx, "Lateral de Gaveta", frente.qtd * 2, ctx.caixa, "caixa", GAVETA_LATERAL_H, frente.profundidade, 0, 1);
      push(ctx, "Frente/Contrafrente Gaveta", frente.qtd * 2, ctx.caixa, "caixa", GAVETA_CAIXOTE_H, W - 50, 0, 1);
      push(ctx, "Fundo de Gaveta", frente.qtd, { cor: ctx.caixa.cor, espessura: GAVETA_FUNDO_ESP }, "fundo", frente.profundidade, W - 35, 0, 0);
      addFerragem(ctx, "corredica_par", frente.qtd);
      return;
    }
  }
}

/**
 * Portas como entidade independente da árvore de vãos: cada grupo cobre a
 * caixa inteira (ignora a divisão interna) ou a união dos vãos selecionados
 * (bounding box via `retanguloVaos`), sobrepondo o conteúdo desses vãos.
 */
function aplicarGruposPortas(ctx: Ctx, box: BoxModule, interiorW: number, interiorH: number, t: number) {
  for (const grupo of box.portas) {
    let W: number;
    let H: number;
    if (grupo.alvo.tipo === "caixa_inteira") {
      W = interiorW;
      H = interiorH;
    } else {
      const rect = retanguloVaos(box.raiz, new Set(grupo.alvo.vaoIds), 0, 0, interiorW, interiorH, t);
      if (!rect) continue;
      W = rect.w;
      H = rect.h;
    }

    const material = ctx.overridePortas ?? grupo.material;
    const larguraPorta = W / grupo.qtd - FOLGA_PORTA;
    const alturaPorta = H - FOLGA_PORTA_V;
    push(ctx, "Porta", grupo.qtd, material, "frente", alturaPorta, larguraPorta, 2, 2);

    const basculante = grupo.sentido === "basculante_pia" || grupo.sentido === "basculante_aereo";
    // Perfil corre na borda onde o puxador ficaria: horizontal (largura) na
    // basculante (topo/base), vertical (altura) nas demais (inclui correr).
    const comprimentoPerfil = basculante ? larguraPorta : alturaPorta;

    if (grupo.tipoAbertura === "correr") {
      addFerragem(ctx, "kit_porta_correr", 1);
      for (let i = 0; i < grupo.qtd; i++) addPuxador(ctx, comprimentoPerfil);
      continue;
    }

    for (let i = 0; i < grupo.qtd; i++) {
      if (basculante) {
        addFerragem(ctx, "pistao", 1);
        addFerragem(ctx, "dobradica_35", 2);
      } else {
        addFerragem(ctx, "dobradica_35", Math.max(2, Math.ceil(alturaPorta / 450)));
      }
      addPuxador(ctx, comprimentoPerfil);
    }
  }
}

/** Tamponamento ESTRUTURAL (gabarito): o vão inteiro vira um painel lateral. */
function aplicarTamponamentoGabarito(
  ctx: Ctx,
  c: Extract<NonNullable<BayNode["content"]>, { tipo: "tamponamento" }>,
  W: number,
  D: number
) {
  const profundidade = D + TAMPONAMENTO_EXTRA;
  const ehLateral = c.lado === "direito" || c.lado === "esquerdo";
  const comp = ehLateral ? ctx.altura : W;
  if (c.sarrafo) {
    push(ctx, `Sarrafo tamponamento (${c.lado})`, 2, c.material, "frente", comp, SARRAFO_LARGURA, 0, 0);
    push(ctx, `Sarrafo tamponamento (${c.lado})`, 2, c.material, "frente", profundidade - 2 * SARRAFO_LARGURA, SARRAFO_LARGURA, 0, 0);
  } else {
    push(ctx, `Tamponamento ${c.lado}`, 1, c.material, "frente", comp, profundidade, 1, 0);
  }
}

/**
 * Tamponamento de INSTÂNCIA (doc 12): painéis colados por fora da carcaça já
 * pronta, um por lado ativado, cada um com sua própria montagem (inteiriça ou
 * sarrafo) e material. Não altera as peças internas da caixa — soma apenas ao
 * consumo de material (a largura de instalação é somada à parte, ver
 * `larguraInstalacaoBox`).
 */
function gerarTamponamentoInstancia(ctx: Ctx, box: BoxModule) {
  const t = box.tamponamento;
  if (!t) return;

  const lados: { lado: TamponamentoLadoNome; comp: number }[] = [
    { lado: "esquerdo", comp: box.altura },
    { lado: "direito", comp: box.altura },
    { lado: "superior", comp: box.largura },
    { lado: "inferior", comp: box.largura },
  ];

  const profundidade = box.profundidade + TAMPONAMENTO_EXTRA;
  for (const l of lados) {
    const cfg = t[l.lado];
    if (!cfg.ativo) continue;
    if (cfg.sarrafo) {
      push(ctx, `Sarrafo tamponamento (${l.lado})`, 2, cfg.material, "frente", l.comp, SARRAFO_LARGURA, 0, 0);
      push(ctx, `Sarrafo tamponamento (${l.lado})`, 2, cfg.material, "frente", profundidade - 2 * SARRAFO_LARGURA, SARRAFO_LARGURA, 0, 0);
    } else {
      push(ctx, `Tamponamento ${l.lado}`, 1, cfg.material, "frente", l.comp, profundidade, 1, 0);
    }
  }
}

type TamponamentoLadoNome = "esquerdo" | "direito" | "superior" | "inferior";

export function explodeBox(box: BoxModule): BoxResult {
  const ctx: Ctx = {
    pecas: [],
    ferragens: new Map(),
    caixa: box.caixa,
    altura: box.altura,
    temFundo: box.temFundo,
    puxador: box.puxador,
    overridePortas: box.overridePortas,
  };
  const t = box.caixa.espessura;

  gerarCarcaca(ctx, box);

  const interiorW = box.largura - 2 * t;
  const interiorD = box.profundidade;
  // A travessa do "inferior" é deitada (como a base) — só consome a espessura
  // t da caixa, igual aereo/torre. Ver TRAVESSA_PROFUNDIDADE acima.
  const interiorH = box.altura - 2 * t;

  explodeVao(ctx, box.raiz, interiorW, interiorH, interiorD);
  aplicarGruposPortas(ctx, box, interiorW, interiorH, t);
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
