import type { GrupoChapas } from "@/lib/engine/box/cutting";
import type { LinhaInsumo } from "@/lib/insumos";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — shape do `snapshot:
// jsonb` gravado em `lista_material` (Modelo-de-Dominio.md Seção 7, D-08:
// "snapshot congelado, extraível texto/CSV"). A tabela já existe (Task 11.2,
// `supabase/migrations/20260727090700_lista_material.sql`) e é INSERT-only
// (sem UPDATE) — "regenerar" é inserir uma nova linha com um snapshot novo,
// nunca editar o antigo (ver `lib/lista-material/congelar.ts`).

/** Item adicionado manualmente pelo usuário (descrição + qtd + valor unitário
 * livre) antes de congelar — mantido em estado local do componente até o
 * congelamento (contrato: "não precisa de tabela nova"). Categoria fixa
 * "Serviço" (ex.: montagem avulsa, transporte especial, item não coberto
 * pelo catálogo) — mesma categoria que `LinhaInsumo.categoria` já usa para
 * montagem/frete em `lib/insumos.ts`. */
export interface ItemManualListaMaterial {
  id: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
}

/** Resumo operacional de UM grupo de material do plano de corte (Modelo de
 * Domínio: chapas compradas, área consumida, peças fora da chapa) — deliberadamente
 * SEM `aproveitamento`/fração de custo (`chapasAlocadas`, Seção 5.2): isso é
 * conceito de precificação/rateio (Dívida B2, Task 13.5/12.6), fora de
 * escopo aqui (ver contrato, "Fora de escopo"). */
export interface ResumoGrupoCorte {
  cor: string;
  espessuraMm: number;
  chapas: number;
  areaConsumidaM2: number;
  /** Nomes das peças maiores que a chapa em qualquer orientação (aviso
   * operacional, não bloqueante — Design-System Seção 8/9.4). */
  pecasForaDaChapa: string[];
}

export interface SnapshotListaMaterial {
  versao: 1;
  geradoEm: string; // ISO 8601
  orcamentoId: string;
  linhas: LinhaInsumo[];
  itensManuais: ItemManualListaMaterial[];
  subtotalMaterial: number;
  subtotalManual: number;
  /** subtotalMaterial + subtotalManual. NÃO inclui `frete` (ver campo abaixo)
   * — decisão de escopo do contrato: frete/montagem/rateio é autoridade da
   * aba Financeiro (Task 13.5), este total é só o pré-pedido de material. */
  total: number;
  /** Cópia informativa de `orcamento.frete` no momento do congelamento —
   * fonte única desse campo continua sendo a coluna do banco (contrato),
   * aqui é só um retrato do valor para a extração texto/CSV. `null` quando o
   * orçamento ainda não tem frete definido. */
  frete: number | null;
  planoDeCorte: ResumoGrupoCorte[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Monta o snapshot a partir dos dados já calculados na tela (BOM real via
 * `montarLinhasInsumos`, plano de corte via `planoDeCorte`, itens manuais em
 * estado local) — usado tanto para congelar (`congelarListaMaterial`) quanto
 * para a extração texto/CSV a partir do estado atual em tela (mesma função,
 * uma fonte de verdade só). Função pura: não lê data/hora do sistema para
 * nada além do próprio carimbo `geradoEm`. */
export function montarSnapshotListaMaterial(input: {
  orcamentoId: string;
  linhas: LinhaInsumo[];
  subtotalMaterial: number;
  itensManuais: ItemManualListaMaterial[];
  frete: number | null;
  grupos: GrupoChapas[];
}): SnapshotListaMaterial {
  const subtotalManual = round2(
    input.itensManuais.reduce((soma, item) => soma + item.quantidade * item.valorUnitario, 0)
  );

  return {
    versao: 1,
    geradoEm: new Date().toISOString(),
    orcamentoId: input.orcamentoId,
    linhas: input.linhas,
    itensManuais: input.itensManuais,
    subtotalMaterial: input.subtotalMaterial,
    subtotalManual,
    total: round2(input.subtotalMaterial + subtotalManual),
    frete: input.frete,
    planoDeCorte: input.grupos.map((grupo) => ({
      cor: grupo.cor,
      espessuraMm: grupo.espessura_mm,
      chapas: grupo.chapas.length,
      areaConsumidaM2: round2(
        grupo.chapas.reduce(
          (soma, chapa) => soma + chapa.pecas.reduce((s, p) => s + (p.w * p.h) / 1_000_000, 0),
          0
        )
      ),
      pecasForaDaChapa: grupo.pecasForaDaChapa.map((p) => p.nome),
    })),
  };
}
