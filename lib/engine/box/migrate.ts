import type {
  BayContent,
  BayNode,
  BoxMaterial,
  BoxModule,
  FrenteConteudo,
  GrupoPortas,
  SentidoAbrir,
  TamponamentoInstancia,
  TamponamentoLado,
} from "./types";

// Migração de dados persistidos (presets no localStorage) salvos em formatos
// anteriores à refatoração atual — sem isso, um preset salvo em formato
// antigo quebra a aplicação inteira ao ser instanciado. Roda em toda leitura
// de preset; é idempotente (dado já no formato novo passa direto).
//
// Duas rodadas de refatoração já migradas aqui:
//  - doc 13: `content.tipo` direto (vazio/portas/gaveta/prateleira/fundo) →
//    aninhado em `content.frente` (espaco/tamponamento).
//  - sessão atual: portas saem do `content.frente` e viram `GrupoPortas`
//    independentes no nível da caixa (`box.portas`); fundo sai do `content`
//    por vão e vira um único `box.temFundo` global.

// Formato de conteúdo ANTES desta sessão: `frente` podia ser "portas", e
// havia um campo `fundo` por vão-folha. Usado só pra ler dados legados —
// não existe mais no tipo atual de `BayContent`.
interface ContentAntigo {
  tipo: "vazio" | "portas" | "gaveta" | "prateleira" | "fundo" | "espaco" | "tamponamento";
  qtd?: number;
  recuo?: number;
  espessura?: number;
  sentidos?: SentidoPortaAntiga[];
  material?: BoxMaterial;
  profundidade?: number;
  interna?: boolean;
  corFrente?: string;
  espessuraFrente?: number;
  frente?: ContentAntigo;
  prateleiras?: { qtd: number; recuo: number };
  fundo?: { espessura: number };
  lado?: string;
  sarrafo?: boolean;
  [k: string]: unknown;
}

type SentidoPortaAntiga = "esquerda" | "direita" | "basculante" | "cava";

function ehFormatoNovo(c: unknown): c is ContentAntigo {
  const t = (c as { tipo?: string } | undefined)?.tipo;
  return t === "espaco" || t === "tamponamento";
}

function mapearSentido(s: SentidoPortaAntiga | undefined, tipoCarcaca: BoxModule["tipo"]): SentidoAbrir {
  switch (s) {
    case "esquerda":
      return "esquerda";
    case "basculante":
      return tipoCarcaca === "aereo" ? "basculante_aereo" : "basculante_pia";
    case "cava":
    case "direita":
    default:
      return "direita";
  }
}

/** Migra o `content` de UM vão-folha pro formato atual: frente fica só
 * "vazio"/"gaveta" (portas são extraídas à parte, ver `coletarPortasEFundo`)
 * e o campo `fundo` por vão é descartado (vira `box.temFundo` global). */
function migrarContent(raw: unknown): BayContent {
  if (!raw) return { tipo: "espaco", frente: { tipo: "vazio" } };

  if (ehFormatoNovo(raw)) {
    const c = raw as ContentAntigo;
    if (c.tipo === "tamponamento") return c as unknown as BayContent;
    // c.tipo === "espaco": pode ter frente "portas" (extraída à parte) e/ou fundo (descartado aqui).
    const frenteAntiga = c.frente;
    const frente: FrenteConteudo =
      frenteAntiga?.tipo === "gaveta"
        ? {
            tipo: "gaveta",
            qtd: frenteAntiga.qtd as number,
            profundidade: frenteAntiga.profundidade as number,
            interna: frenteAntiga.interna as boolean,
            corFrente: frenteAntiga.corFrente as string | undefined,
            espessuraFrente: frenteAntiga.espessuraFrente as number | undefined,
          }
        : { tipo: "vazio" };
    return {
      tipo: "espaco",
      frente,
      prateleiras: c.prateleiras,
    };
  }

  const c = raw as ContentAntigo;
  switch (c.tipo) {
    case "gaveta":
      return {
        tipo: "espaco",
        frente: {
          tipo: "gaveta",
          qtd: c.qtd as number,
          profundidade: c.profundidade as number,
          interna: c.interna as boolean,
          corFrente: c.corFrente as string | undefined,
          espessuraFrente: c.espessuraFrente as number | undefined,
        },
      };
    case "prateleira":
      return {
        tipo: "espaco",
        frente: { tipo: "vazio" },
        prateleiras: { qtd: c.qtd as number, recuo: c.recuo as number },
      };
    case "portas": // extraída à parte — vira vão vazio aqui
    case "fundo": // descartado — vira box.temFundo global
    case "vazio":
    default:
      return { tipo: "espaco", frente: { tipo: "vazio" } };
  }
}

/** Migra recursivamente a árvore de vãos: normaliza o formato de conteúdo e
 * garante que todo nó dividido tenha recuoFrontal/posicao/recuoLateral
 * (default = comportamento visual antigo: 20mm, centralizado). */
export function migrarBayNode(node: BayNode): BayNode {
  if (node.split !== "none" && node.children) {
    return {
      ...node,
      recuoFrontal: node.recuoFrontal ?? 20,
      posicao: node.posicao ?? "centralizado",
      recuoLateral: node.recuoLateral ?? 0,
      children: node.children.map(migrarBayNode),
    };
  }
  return { ...node, content: migrarContent(node.content) };
}

interface PortaColetada {
  vaoId: string;
  sentido: SentidoPortaAntiga;
  qtd: number;
  material: BoxMaterial;
}

/** Percorre a árvore ORIGINAL (antes de `migrarBayNode` limpar as portas do
 * content) coletando toda porta que estava presa a um vão-folha, e se algum
 * vão tinha fundo — usado pra montar `box.portas`/`box.temFundo` globais. */
function coletarPortasEFundo(node: BayNode): { portas: PortaColetada[]; algumFundo: boolean } {
  if (node.split !== "none" && node.children) {
    const inicial: { portas: PortaColetada[]; algumFundo: boolean } = { portas: [], algumFundo: false };
    return node.children.reduce((acc, c) => {
      const r = coletarPortasEFundo(c);
      return { portas: [...acc.portas, ...r.portas], algumFundo: acc.algumFundo || r.algumFundo };
    }, inicial);
  }

  const c = node.content as ContentAntigo | undefined;
  if (!c) return { portas: [], algumFundo: false };

  // Formato bem antigo (pré doc 13): tipo direto na raiz do content.
  if (c.tipo === "portas") {
    return {
      portas: [{ vaoId: node.id, sentido: (c.sentidos?.[0] ?? "direita"), qtd: c.qtd ?? 1, material: c.material as BoxMaterial }],
      algumFundo: false,
    };
  }
  if (c.tipo === "fundo") return { portas: [], algumFundo: true };

  // Formato atual (antes desta sessão): espaco.frente / espaco.fundo.
  if (c.tipo === "espaco") {
    const portas: PortaColetada[] =
      c.frente?.tipo === "portas"
        ? [
            {
              vaoId: node.id,
              sentido: (c.frente.sentidos?.[0] ?? "direita"),
              qtd: c.frente.qtd ?? 1,
              material: c.frente.material as BoxMaterial,
            },
          ]
        : [];
    return { portas, algumFundo: c.fundo != null };
  }

  return { portas: [], algumFundo: false };
}

/** Migra o tamponamento de instância: de config única compartilhada por
 * todos os lados (antigo) para config independente por lado (novo). */
function migrarTamponamento(raw: unknown): TamponamentoInstancia | undefined {
  if (!raw) return undefined;
  const t = raw as Record<string, unknown>;
  if (typeof t.esquerdo === "boolean") {
    const material = t.material as TamponamentoLado["material"];
    const sarrafo = Boolean(t.sarrafo);
    const ladoDe = (ativo: unknown): TamponamentoLado => ({
      ativo: Boolean(ativo),
      sarrafo,
      material,
    });
    return {
      esquerdo: ladoDe(t.esquerdo),
      direito: ladoDe(t.direito),
      superior: ladoDe(t.superior),
      inferior: ladoDe(t.inferior),
    };
  }
  return raw as TamponamentoInstancia;
}

/** Migra um BoxModule completo (árvore de vãos + portas + fundo global +
 * tamponamento de instância). */
export function migrarBoxModule(box: BoxModule): BoxModule {
  const { portas: portasAntigas, algumFundo } = coletarPortasEFundo(box.raiz);
  const gruposMigrados: GrupoPortas[] = portasAntigas.map((p, i) => ({
    id: `migrado-porta-${p.vaoId}-${i}`,
    alvo: { tipo: "vaos", vaoIds: [p.vaoId] },
    tipoAbertura: "abrir",
    sentido: mapearSentido(p.sentido, box.tipo),
    qtd: p.qtd,
    material: p.material,
  }));

  const legado = box as unknown as { overrideTemFundo?: boolean };

  return {
    ...box,
    raiz: migrarBayNode(box.raiz),
    portas: [...(box.portas ?? []), ...gruposMigrados],
    temFundo: box.temFundo ?? legado.overrideTemFundo ?? algumFundo,
    tamponamento: migrarTamponamento(box.tamponamento),
  };
}
