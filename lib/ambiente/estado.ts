// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md) — estado profundo de
// "Ambientes" (Parede + módulos posicionados + elementos contínuos + alturas
// de faixa), extraído de `AmbientesLab` para ser o contrato de PROPS entre o
// componente presentacional (`components/ambientes/AmbientesLab.tsx`) e cada
// "dono de I/O" que agora existe:
//  - `AmbientesTabConectada` (Supabase, `/orcamento/[id]`, real) —
//    `lib/ambiente/carregar.ts` + `lib/ambiente/salvar.ts` + `mutar.ts`.
//  - `AmbientesTabMock` (harness `/dev/preview/orcamento`, sem I/O nenhum).
//  - `AmbientesLabStandalone` (laboratório `/ambientes`, localStorage —
//    `lib/ambiente/persistenciaLocal.ts`).
// `AmbientesLab` em si só recebe/devolve este shape via props — não sabe de
// onde veio nem para onde vai (Supabase, localStorage ou nada).
//
// Task 2.3-2.6 — [V2.1] fim do singleton: `parede: Parede` (1 por orçamento)
// vira `ambientes: AmbienteItem[]` (N ambientes, cada um com N paredes —
// Modelo-de-Dominio.md Seção 3.2). `modulos`/`alturas`/`elementosContinuos`
// continuam por ORÇAMENTO INTEIRO (não mudam de escopo — já eram assim).
// `overrides` (handle de junção) também continua uma lista FLAT por
// orçamento: cada `OverrideJuncao` referencia um par de `itemId`, e os
// `itemId` já são globalmente únicos (gerados por timestamp+random em
// `AmbientesLab.novoItemId`) — não há necessidade de aninhar por parede
// para desambiguar. Ao persistir (`lib/ambiente/salvar.ts`), cada override é
// gravado na coluna `parede.overrides_juncao` da parede DONA dos itemId que
// ele referencia (ver `salvar.ts`), mas em memória o array continua único e
// plano, exatamente como já era antes desta task.

import type { AlturasFaixas, Parede } from "@/lib/engine/parede/types";
import type { ElementoContinuo } from "@/lib/engine/elemento-continuo/types";
import type { OverrideJuncao } from "@/lib/engine/conjunto";
import type { ModuloOrcamento } from "@/lib/orcamento";

/** IDs sentinela usados SÓ pelo estado padrão em memória de um orçamento que
 * ainda não tem nenhuma linha real em `ambiente`/`parede` — nunca colidem
 * com um uuid real do banco. `lib/ambiente/salvar.ts` reconhece uma parede/
 * ambiente que ainda não existe (tenta UPDATE, 0 linhas afetadas) e cria a
 * linha real na primeira vez que o usuário salva. */
export const AMBIENTE_PADRAO_ID = "ambiente-1";
export const PAREDE_PADRAO_ID = "parede-1";

/** `Parede` (tipo do motor, `lib/engine/parede/types.ts`) + metadados de UI/
 * persistência que o motor não precisa conhecer (nome livre, ordem estável —
 * Modelo-de-Dominio.md Seção 3.2). Mantido separado do tipo do motor para não
 * misturar responsabilidade de cálculo com responsabilidade de cadastro. */
export interface ParedeComMeta extends Parede {
  nome: string;
  ordem: number;
}

export interface AmbienteItem {
  id: string;
  nome: string;
  ordem: number;
  paredes: ParedeComMeta[];
}

export interface EstadoAmbiente {
  /** [V2.1] N ambientes, cada um com N paredes — substitui o antigo campo
   * `parede: Parede` singular. `AmbientesLab` deriva "a parede selecionada"
   * disto via `ambienteSelecionadoId`/`paredeSelecionadaId` (estado de UI,
   * não faz parte deste contrato — só existe dentro do componente). */
  ambientes: AmbienteItem[];
  /** Módulos REAIS copiados do preset ao posicionar — mapeia pra
   * `orcamento.itens` (jsonb `ModuloOrcamento[]`). Escopo: ORÇAMENTO INTEIRO
   * (todas as paredes de todos os ambientes referenciam este mesmo array). */
  modulos: ModuloOrcamento[];
  /** As 4 alturas do perfil da organização. ATENÇÃO: é dado de nível ORG
   * (`organizacao.alturas_padrao`), não por orçamento — ver
   * `lib/ambiente/carregar.ts`. Campo SOMENTE LEITURA aqui:
   * `lib/ambiente/salvar.ts` nunca escreve em `organizacao.alturas_padrao`
   * (perfil só muda em `/perfil`). */
  alturas: AlturasFaixas;
  /** Mapeia pra N linhas de `elemento_continuo` (sincronizadas por
   * delete+insert do conjunto inteiro a cada salvamento — ver
   * `lib/ambiente/salvar.ts`). Escopo: ORÇAMENTO INTEIRO. */
  elementosContinuos: ElementoContinuo[];
  /** Overrides do handle de junção — lista FLAT por orçamento (ver nota de
   * escopo acima). Mapeia pra `parede.overrides_juncao`, uma parede por vez,
   * filtrado por posse do itemId (`lib/ambiente/salvar.ts`). */
  overrides: OverrideJuncao[];
}

export interface ResultadoSalvarAmbiente {
  ok: boolean;
  /** Mensagem legível (Design-System Seção 11) — só presente quando `ok`
   * é `false`. */
  erro?: string;
  /** Presente só quando `salvarEstadoAmbiente` criou a linha real de um
   * ambiente/parede que ainda só existia em memória (bootstrap do orçamento
   * novo, ver `lib/ambiente/salvar.ts`) — mapeia o id sentinela/local usado
   * em memória para o id real (uuid) gerado pelo banco. `AmbientesLab`
   * aplica este remapeamento no próprio estado local logo após salvar, para
   * que o PRÓXIMO salvamento faça UPDATE em vez de criar uma linha
   * duplicada. */
  idsRemapeados?: { ambientes: Record<string, string>; paredes: Record<string, string> };
}

// ---------------------------------------------------------------------------
// Task 2.3-2.6 — CRUD imediato (nunca autosave) de ambiente/parede: cada ação
// do usuário na lista (criar/renomear/excluir/reordenar) chama isto direto,
// sem esperar o botão "Salvar alterações" (que continua só para o conteúdo
// profundo de cada parede — elementos, itens). Compartilhado entre
// `AmbientesLab` (prop `onMutarAmbientes`) e cada "dono de I/O".
// ---------------------------------------------------------------------------

export type ComandoAmbiente =
  | { tipo: "criarAmbiente"; nome: string }
  | { tipo: "renomearAmbiente"; ambienteId: string; nome: string }
  | { tipo: "excluirAmbiente"; ambienteId: string }
  | { tipo: "reordenarAmbientes"; idsNaNovaOrdem: string[] }
  | { tipo: "criarParede"; ambienteId: string; nome: string }
  | { tipo: "renomearParede"; paredeId: string; nome: string }
  | { tipo: "excluirParede"; paredeId: string }
  | { tipo: "reordenarParedes"; ambienteId: string; idsNaNovaOrdem: string[] };

export interface ResultadoMutarAmbientes {
  ok: boolean;
  /** Lista de ambientes/paredes já atualizada — presente sempre que `ok` é
   * `true`. `AmbientesLab` substitui seu estado local por este valor (nunca
   * reimplementa a mutação sozinho). */
  ambientes?: AmbienteItem[];
  /** Só presente quando a mutação pode ter deixado `itemId` órfão em
   * `orcamento.itens` (excluirAmbiente/excluirParede) — já vem SEM os
   * órfãos: a Server Action `removerItensOrfaosDoOrcamento`
   * (`lib/ambiente/acoes.ts`) já limpou no banco; aqui só refletimos o
   * resultado, nunca recalculamos a regra de novo na UI. */
  modulos?: ModuloOrcamento[];
  erro?: string;
}

export function paredeInicial(): ParedeComMeta {
  return {
    id: PAREDE_PADRAO_ID,
    nome: "Parede 1",
    ordem: 0,
    largura: 3000,
    altura: 2700,
    elementos: [],
    itens: [],
  };
}

export function alturasIniciais(): AlturasFaixas {
  return { alturaRodape: 100, alturaBancada: 900, alturaInstalacaoAereo: 1400, peDireito: 2700 };
}

export function ambienteInicial(): AmbienteItem {
  return { id: AMBIENTE_PADRAO_ID, nome: "Ambiente 1", ordem: 0, paredes: [paredeInicial()] };
}

export function estadoAmbientePadrao(): EstadoAmbiente {
  return {
    ambientes: [ambienteInicial()],
    modulos: [],
    alturas: alturasIniciais(),
    elementosContinuos: [],
    overrides: [],
  };
}

/** Aplica um `ComandoAmbiente` EM MEMÓRIA, sem I/O — usada por `AmbientesLab`
 * quando não há `onMutarAmbientes` (harness `/dev/preview/orcamento` e
 * laboratório `/ambientes`, nenhum dos dois tem `orcamentoId`/Supabase real
 * pra chamar `lib/ambiente/mutar.ts`). Função pura, mesmo espírito de
 * `lib/ambiente/mapear.ts` — testável sem mockar nada. `AmbientesTabConectada`
 * NUNCA usa esta função: lá a verdade vem do banco via `mutarAmbientes`
 * (`lib/ambiente/mutar.ts`), que já delega a `lib/ambiente/acoes.ts`. */
export function aplicarComandoAmbiente(
  ambientes: AmbienteItem[],
  comando: ComandoAmbiente,
  gerarId: () => string
): AmbienteItem[] {
  switch (comando.tipo) {
    case "criarAmbiente": {
      const ordem = ambientes.length;
      const idParede = gerarId();
      const novo: AmbienteItem = {
        id: gerarId(),
        nome: comando.nome,
        ordem,
        paredes: [{ id: idParede, nome: "Parede 1", ordem: 0, largura: 3000, altura: 2700, elementos: [], itens: [] }],
      };
      return [...ambientes, novo];
    }
    case "renomearAmbiente":
      return ambientes.map((a) => (a.id === comando.ambienteId ? { ...a, nome: comando.nome } : a));
    case "excluirAmbiente":
      return ambientes.filter((a) => a.id !== comando.ambienteId);
    case "reordenarAmbientes": {
      const porId = new Map(ambientes.map((a) => [a.id, a]));
      return comando.idsNaNovaOrdem
        .map((id, ordem) => {
          const a = porId.get(id);
          return a ? { ...a, ordem } : null;
        })
        .filter((a): a is AmbienteItem => a !== null);
    }
    case "criarParede":
      return ambientes.map((a) =>
        a.id === comando.ambienteId
          ? {
              ...a,
              paredes: [
                ...a.paredes,
                {
                  id: gerarId(),
                  nome: comando.nome,
                  ordem: a.paredes.length,
                  largura: 3000,
                  altura: 2700,
                  elementos: [],
                  itens: [],
                },
              ],
            }
          : a
      );
    case "renomearParede":
      return ambientes.map((a) => ({
        ...a,
        paredes: a.paredes.map((p) => (p.id === comando.paredeId ? { ...p, nome: comando.nome } : p)),
      }));
    case "excluirParede":
      return ambientes.map((a) => ({ ...a, paredes: a.paredes.filter((p) => p.id !== comando.paredeId) }));
    case "reordenarParedes":
      return ambientes.map((a) => {
        if (a.id !== comando.ambienteId) return a;
        const porId = new Map(a.paredes.map((p) => [p.id, p]));
        const paredes = comando.idsNaNovaOrdem
          .map((id, ordem) => {
            const p = porId.get(id);
            return p ? { ...p, ordem } : null;
          })
          .filter((p): p is ParedeComMeta => p !== null);
        return { ...a, paredes };
      });
  }
}
