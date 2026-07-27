// V3 — Motor de caixa vazia + subdivisões (arquitetura CAD paramétrica).
// Cada módulo é uma caixa que o usuário subdivide recursivamente em vãos, e em
// cada vão-folha coloca conteúdo (portas, gavetas, prateleiras, etc.).

export type CarcassType = "aereo" | "inferior" | "torre";

export interface BoxMaterial {
  cor: string;
  espessura: number; // mm
  // Veio de chapa (Modelo de Domínio, Seção 8 — Task 12.5). Opcional: ausente
  // (`undefined`) tem semântica "sem veio" (mesmo tratamento que `false`) —
  // decisão pra não quebrar os presets/fixtures existentes (`boxPresets.ts`,
  // testes) que já criam `BoxMaterial` sem esse campo. Leia sempre via
  // `material.temVeio ?? false`, nunca acesse direto quando o valor puder
  // decidir algo booleano.
  temVeio?: boolean;
}

// A "frente" de um vão-folha: o que cobre a abertura visível (ou nada).
// Portas NÃO fazem parte daqui — são uma entidade independente (`GrupoPortas`,
// ver abaixo) que pode cobrir 1+ vãos, ou a caixa inteira, sobrepondo o que
// tiver por baixo. Independente de prateleiras — um vão com gaveta PODE ter
// prateleiras internas ao mesmo tempo (não precisa dividir o vão para isso).
export type FrenteConteudo =
  | { tipo: "vazio" }
  | {
      tipo: "gaveta";
      qtd: number;
      profundidade: number; // mm
      interna: boolean; // true = guarda-roupa (frente cor da caixa)
      corFrente?: string; // usado quando externa
      espessuraFrente?: number; // usado quando externa (default 18)
    };

// Conteúdo de um vão-folha: espaço normal (frente + prateleiras combináveis).
// Até a Task 12.4, `BayContent` também tinha um branch `tipo: "tamponamento"`
// (vão inteiro virando um painel de tamponamento ESTRUTURAL, parte do
// gabarito). Esse branch saiu do modelo (Modelo de Domínio, Seção 3.6): o
// mecanismo unificado `ElementoContinuo` tipo "tamponamento"
// (lib/engine/elemento-continuo/) substitui esse caso de uso. `BayContent`
// deixa de ser union — mantém o campo `tipo: "espaco"` (não é mais
// discriminante de nada, já que só resta uma forma) só pra minimizar o raio
// de impacto em código que já lê `content.tipo` (migrate.ts, tree.ts, testes).
export type BayContent = {
  tipo: "espaco";
  frente: FrenteConteudo;
  prateleiras?: { qtd: number; recuo: number }; // recuo frontal (mm)
};

export type PosicaoDivisao = "centralizado" | "direita" | "esquerda";

export interface BayNode {
  id: string;
  split: "vertical" | "horizontal" | "none";
  qtdDivisorias: number; // nº de divisórias (gera qtdDivisorias+1 vãos)
  // Só relevantes quando split !== "none":
  recuoFrontal?: number; // mm, recuo frontal das divisórias deste grupo (default 20)
  posicao?: PosicaoDivisao; // default "centralizado" (vãos iguais)
  recuoLateral?: number; // mm, medida do vão da ponta quando posicao !== "centralizado"
  children?: BayNode[]; // sub-vãos quando dividido
  content?: BayContent; // conteúdo quando split === "none"
}

// Porta como entidade independente da árvore de vãos: um grupo cobre 1+
// vãos selecionados (sobrepondo prateleiras/gavetas internas, que ficam
// escondidas atrás) ou a caixa inteira (ignora a divisão interna).
export type SentidoAbrir = "basculante_pia" | "basculante_aereo" | "direita" | "esquerda";
export type SentidoCorrer = "direita" | "esquerda";

export type AlvoPortas =
  | { tipo: "caixa_inteira" }
  | { tipo: "vaos"; vaoIds: string[] };

export interface GrupoPortas {
  id: string;
  alvo: AlvoPortas;
  tipoAbertura: "abrir" | "correr";
  sentido: SentidoAbrir | SentidoCorrer;
  qtd: number;
  material: BoxMaterial;
}

// Puxador: config única por caixa, usada em toda porta (grupos de porta) e
// em toda frente de gaveta externa. "haste" = puxador físico numa posição da
// frente (ferragem "puxador", un.); "perfil" = perfil contínuo na borda onde
// ficaria o puxador (ferragem "perfil_puxador_m", por metro); "sem_puxador" =
// frente lisa, sem ferragem de puxador.
export type TipoPuxador = "haste" | "perfil" | "sem_puxador";

// Tamponamento de INSTÂNCIA (comercial/instalação) — diferente do
// `BayContent` "tamponamento" (que é estrutural, parte do gabarito). Decidido:
// o painel é colado POR FORA da carcaça já pronta, somando à largura de
// instalação do módulo (não altera as peças internas da carcaça). Cada lado
// tem sua própria montagem (inteiriça/sarrafo) e material.
export interface TamponamentoLado {
  ativo: boolean;
  sarrafo: boolean;
  material: BoxMaterial;
}
export interface TamponamentoInstancia {
  esquerdo: TamponamentoLado;
  direito: TamponamentoLado;
  superior: TamponamentoLado;
  inferior: TamponamentoLado;
}

export interface BoxModule {
  id: string;
  nome: string;
  tipo: CarcassType;
  parede?: string;
  categoria?: string; // ambiente de origem do preset (informativo, herdado ao instanciar)
  largura: number; // mm
  altura: number; // mm
  profundidade: number; // mm
  caixa: BoxMaterial; // cor + espessura da caixa interna (laterais, base, tampo…)
  raiz: BayNode;
  portas: GrupoPortas[]; // grupos de porta, independentes da árvore de vãos
  temFundo: boolean; // aplica fundo (espessura fixa) em todos os vãos-folha "espaco"
  puxador: TipoPuxador; // haste | perfil | sem_puxador — vale pra portas e gaveta externa
  tamponamento?: TamponamentoInstancia; // override de instância (doc 12, Etapa 3)
  overridePortas?: BoxMaterial; // override de instância: cor/espessura de TODAS as portas
}

/** Espessura lateral extra somada à largura de instalação (doc 12: decisão A). */
export function larguraInstalacaoBox(box: BoxModule): number {
  const t = box.tamponamento;
  if (!t) return box.largura;
  const esq = t.esquerdo.ativo ? t.esquerdo.material.espessura : 0;
  const dir = t.direito.ativo ? t.direito.material.espessura : 0;
  return box.largura + esq + dir;
}

/** Cria um vão-folha vazio (espaço sem frente, sem prateleiras, sem fundo). */
export function vaoVazio(id: string): BayNode {
  return { id, split: "none", qtdDivisorias: 0, content: { tipo: "espaco", frente: { tipo: "vazio" } } };
}
