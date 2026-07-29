import type { ItemQtd, Peca, SentidoVeio } from "../types";
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
const GAVETA_LATERAL_H = 120;
const GAVETA_CAIXOTE_H = 100;
const GAVETA_FUNDO_ESP = 6;
const AFASTADOR = 30;
const FUNDO_ESP_PADRAO = 6; // espessura fixa do fundo quando box.temFundo = true
const LARGURA_FUNDO_LIMITE = 1800; // mm — acima disso, cada divisão vertical parte o fundo

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

/**
 * Classificação de `sentidoVeio` por família de peça (Seção 8, Task 12.5):
 * cada chamada de `push` abaixo passa o valor explicitamente, seguindo esta
 * regra geral (derivada da regra literal da spec — "peças de altura/largura
 * do módulo → comprimento da chapa; peças de profundidade → largura da
 * chapa" — combinada com a nomenclatura real de `cutting.ts`, onde
 * `PecaRetangular.w` corre no eixo do COMPRIMENTO e `.h` no eixo da
 * LARGURA-DA-CHAPA):
 *
 * - Quando o valor de PROFUNDIDADE do módulo (ou um equivalente — a medida
 *   que "entra" no móvel) é passado no parâmetro `largura` desta função
 *   (isto é, vai para `Peca.largura_mm`): `sentidoVeio: "largura"` — isso
 *   INVERTE a orientação padrão em `cutting.ts` (`w = altura_mm`,
 *   `h = largura_mm`), pra que a profundidade (em `largura_mm`) caia no eixo
 *   Y = largura-da-chapa, como a regra exige. Ex.: Lateral (altura_mm =
 *   altura do módulo, largura_mm = profundidade).
 * - Quando a profundidade (se houver) é passada no parâmetro `altura` desta
 *   função (`Peca.altura_mm`), ou quando a peça não tem componente de
 *   profundidade nenhum (deriva só de altura/largura do módulo, ex.: Fundo):
 *   `sentidoVeio: "comprimento"` — mantém a orientação padrão já usada por
 *   `expandirPecas` hoje (`w = largura_mm`, `h = altura_mm`), que já deixa a
 *   profundidade (quando presente, em `altura_mm`) no eixo Y.
 *
 * Ou seja: o nome do valor não descreve "qual dimensão física é maior", e
 * sim "qual dos dois campos (`altura_mm`/`largura_mm`) vai para o eixo X
 * (comprimento) da chapa" — ver `expandirPecas`/`empacotarChapas` em
 * `lib/engine/box/cutting.ts`.
 */
function push(
  ctx: Ctx,
  nome: string,
  quantidade: number,
  material: BoxMaterial,
  materialTipo: Peca["material_tipo"],
  altura: number,
  largura: number,
  fitaAltura: number,
  fitaLargura: number,
  sentidoVeio: SentidoVeio
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
    temVeio: material.temVeio ?? false,
    sentidoVeio,
  });
}

/** Carcaça estrutural conforme o tipo (aéreo/inferior/torre). */
function gerarCarcaca(ctx: Ctx, box: BoxModule) {
  const { caixa } = ctx;
  const t = caixa.espessura;
  const larguraInterna = box.largura - 2 * t;

  // Laterais (sempre inteiriças). altura_mm = altura do módulo, largura_mm =
  // profundidade → profundidade cai em largura_mm → "largura" (inverte a
  // orientação padrão pra profundidade ir pro eixo Y/largura-da-chapa).
  push(ctx, "Lateral", 2, caixa, "caixa", box.altura, box.profundidade, 1, 0, "largura");
  // Base (sempre inteiriça). altura_mm = profundidade, largura_mm = largura
  // do módulo → profundidade já em altura_mm → "comprimento" (padrão).
  push(ctx, "Base", 1, caixa, "caixa", box.profundidade, larguraInterna, 0, 1, "comprimento");

  if (box.tipo === "inferior") {
    // Topo = 2 travessas rasas (deitadas, como a base — ver TRAVESSA_PROFUNDIDADE),
    // não um tampo inteiriço. Cada travessa é uma tira de TRAVESSA_PROFUNDIDADE
    // de profundidade × larguraInterna, uma junto à frente, outra ao fundo.
    // Mesmo padrão da Base (profundidade em altura_mm) → "comprimento".
    push(ctx, "Travessa Superior Frontal", 1, caixa, "caixa", TRAVESSA_PROFUNDIDADE, larguraInterna, 0, 1, "comprimento");
    push(ctx, "Travessa Superior Traseira", 1, caixa, "caixa", TRAVESSA_PROFUNDIDADE, larguraInterna, 0, 1, "comprimento");
  } else {
    // Tampo: mesmo padrão da Base (profundidade em altura_mm) → "comprimento".
    push(ctx, "Tampo", 1, caixa, "caixa", box.profundidade, larguraInterna, 0, 1, "comprimento");
  }
  if (box.tipo === "torre") {
    // Rodapé Frontal: altura_mm = RODAPE_H (constante, não deriva de
    // profundidade), largura_mm = largura do módulo → sem componente de
    // profundidade → "comprimento" (mesmo tratamento de peças derivadas só
    // de altura/largura do módulo).
    push(ctx, "Rodapé Frontal", 1, caixa, "caixa", RODAPE_H, larguraInterna, 0, 1, "comprimento");
  }
}

/** Explode um vão (recursivo). W×H×D são as dimensões internas do vão. */
function explodeVao(ctx: Ctx, node: BayNode, W: number, H: number, D: number) {
  const t = ctx.caixa.espessura;

  if (node.split === "vertical" && node.qtdDivisorias > 0) {
    const recuo = node.recuoFrontal ?? RECUO_DIVISORIA_PADRAO;
    // altura_mm = H (altura do vão), largura_mm = D-recuo (profundidade) →
    // profundidade em largura_mm → "largura" (mesmo padrão da Lateral).
    push(ctx, "Divisória Vertical", node.qtdDivisorias, ctx.caixa, "caixa", H, D - recuo, 1, 0, "largura");
    const larguras = tamanhosFilhos(node, W, t);
    const filhos = node.children ?? [];
    filhos.forEach((filho, i) => explodeVao(ctx, filho, larguras[i], H, D));
    return;
  }

  if (node.split === "horizontal" && node.qtdDivisorias > 0) {
    const recuo = node.recuoFrontal ?? RECUO_DIVISORIA_PADRAO;
    // altura_mm = D-recuo (profundidade), largura_mm = W (largura do vão) →
    // profundidade já em altura_mm → "comprimento" (mesmo padrão da Base).
    push(ctx, "Divisória Horizontal", node.qtdDivisorias, ctx.caixa, "caixa", D - recuo, W, 0, 1, "comprimento");
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

  // c.tipo === "espaco" (única forma desde a Task 12.4 — tamponamento
  // ESTRUTURAL saiu do BayContent, ver types.ts): frente (vazio/gaveta) +
  // prateleiras são independentes e combináveis — portas ficam fora daqui
  // (ver aplicarGruposPortas), assim como o fundo (ver gerarFundoGlobal), pois
  // ambos cobrem 1+ vãos ou a caixa inteira, não o vão-folha isolado.
  aplicarFrente(ctx, c.frente, W, H, D);
  if (c.prateleiras && c.prateleiras.qtd > 0) {
    // altura_mm = D-recuo (profundidade), largura_mm = W-2 (largura do vão) →
    // profundidade já em altura_mm → "comprimento" (mesmo padrão da Base).
    push(ctx, "Prateleira", c.prateleiras.qtd, ctx.caixa, "prateleira", D - c.prateleiras.recuo, W - 2, 0, 1, "comprimento");
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
        // Frente/Montante: painéis de face (altura/largura do vão, sem
        // componente de profundidade) → "comprimento".
        push(ctx, "Frente Gaveta Interna", frente.qtd, ctx.caixa, "caixa", alturaFrente, larguraFrente, 2, 2, "comprimento");
        // Lateral Montante: altura_mm = H, largura_mm = D-100 (profundidade)
        // → profundidade em largura_mm → "largura" (mesmo padrão da Lateral).
        push(ctx, "Lateral Montante", 2, ctx.caixa, "caixa", H, D - 100, 1, 0, "largura");
        // Travessa Montante: altura_mm = 100 (constante, sem profundidade),
        // largura_mm = largura do vão → "comprimento".
        push(ctx, "Travessa Montante", 2, ctx.caixa, "caixa", 100, W - 2 * ctx.caixa.espessura, 0, 1, "comprimento");
        // Afastador Montante: altura_mm = H, largura_mm = AFASTADOR
        // (constante, sem profundidade) → "comprimento".
        push(ctx, "Afastador Montante", 2, ctx.caixa, "caixa", H, AFASTADOR, 0, 0, "comprimento");
      } else {
        // Material ad hoc (pode ser cor/espessura diferente da caixa): não
        // propaga `temVeio` da caixa — decisão documentada no relatório da
        // task, `temVeio` só é herdado quando o material É de fato o mesmo
        // objeto `BoxMaterial` (ctx.caixa/grupo.material/cfg.material).
        const material: BoxMaterial = {
          cor: frente.corFrente ?? ctx.caixa.cor,
          espessura: frente.espessuraFrente ?? 18,
        };
        // Painel de face, sem componente de profundidade → "comprimento".
        push(ctx, "Frente Gaveta Externa", frente.qtd, material, "frente", alturaFrente, larguraFrente, 2, 2, "comprimento");
        // Perfil de gaveta corre ao longo da borda superior da frente (largura).
        for (let i = 0; i < frente.qtd; i++) addPuxador(ctx, larguraFrente);
      }
      // Caixote da gaveta (comum às duas).
      // Lateral de Gaveta: altura_mm = GAVETA_LATERAL_H (constante),
      // largura_mm = profundidade da gaveta → profundidade em largura_mm →
      // "largura" (mesmo padrão da Lateral da carcaça).
      push(ctx, "Lateral de Gaveta", frente.qtd * 2, ctx.caixa, "caixa", GAVETA_LATERAL_H, frente.profundidade, 0, 1, "largura");
      // Frente/Contrafrente Gaveta: painel de face (altura_mm constante,
      // largura_mm = largura do vão, sem profundidade) → "comprimento".
      push(ctx, "Frente/Contrafrente Gaveta", frente.qtd * 2, ctx.caixa, "caixa", GAVETA_CAIXOTE_H, W - 50, 0, 1, "comprimento");
      // Fundo de Gaveta: altura_mm = profundidade da gaveta, largura_mm =
      // largura do vão → profundidade já em altura_mm → "comprimento" (mesmo
      // padrão da Base). Material ad hoc (espessura de fundo, ver nota acima
      // sobre não herdar `temVeio` da caixa).
      push(ctx, "Fundo de Gaveta", frente.qtd, { cor: ctx.caixa.cor, espessura: GAVETA_FUNDO_ESP }, "fundo", frente.profundidade, W - 35, 0, 0, "comprimento");
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
    // Painel de face (altura/largura da porta, sem profundidade) → "comprimento".
    push(ctx, "Porta", grupo.qtd, material, "frente", alturaPorta, larguraPorta, 2, 2, "comprimento");

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

/**
 * Nº de "colunas" verticais que atravessam a altura INTEIRA da caixa, usado
 * só pra decidir em quantas tiras o fundo se divide. Só soma através de
 * divisões verticais aninhadas (cada uma continua atravessando a altura
 * inteira, só fica mais estreita). Qualquer divisão horizontal no caminho —
 * ou uma folha — quebra essa continuidade: o que estiver dentro dela (por
 * mais dividido que esteja) nunca atravessa a caixa inteira, então conta
 * como 1 coluna só, sem propagar a fragmentação interna pra fora.
 */
function contarColunasVerticais(node: BayNode): number {
  if (node.split === "vertical" && node.qtdDivisorias > 0 && node.children) {
    return node.children.reduce((soma, c) => soma + contarColunasVerticais(c), 0);
  }
  return 1;
}

/**
 * Fundo como painel(éis) da caixa inteira (largura × altura do módulo, não
 * do vão-folha): 1 peça só até `LARGURA_FUNDO_LIMITE`; acima disso, parte em
 * tantas tiras iguais quantas forem as colunas verticais da árvore (cada
 * divisão vertical adicionada gera mais uma tira), sempre com a altura
 * inteira da caixa — divisões horizontais não afetam a contagem.
 */
function gerarFundoGlobal(ctx: Ctx, box: BoxModule) {
  if (!ctx.temFundo) return;
  const colunas = box.largura > LARGURA_FUNDO_LIMITE ? Math.max(1, contarColunasVerticais(box.raiz)) : 1;
  const larguraPorPeca = box.largura / colunas;
  // Fundo: altura_mm = altura do módulo, largura_mm = largura do módulo —
  // deriva só de altura+largura (sem profundidade), exemplo literal da
  // Seção 8 → "comprimento". Material ad hoc (espessura de fundo fixa, ver
  // nota em "Fundo de Gaveta" sobre não herdar `temVeio` da caixa).
  push(ctx, "Fundo", colunas, { cor: ctx.caixa.cor, espessura: FUNDO_ESP_PADRAO }, "fundo", box.altura, larguraPorPeca, 0, 0, "comprimento");
}

export function explodeBox(box: BoxModule): BoxResult {
  const ctx: Ctx = {
    pecas: [],
    ferragens: new Map(),
    caixa: box.caixa,
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
  gerarFundoGlobal(ctx, box);

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
