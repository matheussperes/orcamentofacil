import type {
  BayContent,
  BayNode,
  BoxModule,
  TamponamentoInstancia,
  TamponamentoLado,
} from "./types";

// Migração de dados persistidos (presets no localStorage) que foram salvos
// ANTES da refatoração do modelo de conteúdo (doc 13). Sem isso, um preset
// salvo no formato antigo quebra a aplicação inteira ao ser instanciado —
// `rotuloConteudo`/`explode.ts` esperam `content.frente`, que não existe no
// formato antigo. Roda em toda leitura de preset; é idempotente (conteúdo já
// no formato novo passa direto).

// Formato antigo de BayContent: `tipo` era um dos 5 tipos de conteúdo
// diretamente (não havia "espaco"/"frente" aninhados).
interface ContentAntigo {
  tipo: "vazio" | "portas" | "gaveta" | "prateleira" | "fundo";
  [k: string]: unknown;
}

function ehFormatoNovo(c: unknown): c is BayContent {
  const t = (c as { tipo?: string } | undefined)?.tipo;
  return t === "espaco" || t === "tamponamento";
}

function migrarContent(raw: unknown): BayContent {
  if (!raw) return { tipo: "espaco", frente: { tipo: "vazio" } };
  if (ehFormatoNovo(raw)) return raw;

  const c = raw as ContentAntigo;
  switch (c.tipo) {
    case "portas":
      return {
        tipo: "espaco",
        frente: {
          tipo: "portas",
          qtd: c.qtd as number,
          sentidos: c.sentidos as never,
          material: c.material as never,
        },
      };
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
    case "fundo":
      return {
        tipo: "espaco",
        frente: { tipo: "vazio" },
        fundo: { espessura: c.espessura as number },
      };
    case "vazio":
    default:
      return { tipo: "espaco", frente: { tipo: "vazio" } };
  }
}

/** Migra recursivamente a árvore de vãos (formato antigo → novo). */
export function migrarBayNode(node: BayNode): BayNode {
  if (node.split !== "none" && node.children) {
    return { ...node, children: node.children.map(migrarBayNode) };
  }
  return { ...node, content: migrarContent(node.content) };
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

/** Migra um BoxModule completo (árvore de vãos + tamponamento de instância). */
export function migrarBoxModule(box: BoxModule): BoxModule {
  return {
    ...box,
    raiz: migrarBayNode(box.raiz),
    tamponamento: migrarTamponamento(box.tamponamento),
  };
}
