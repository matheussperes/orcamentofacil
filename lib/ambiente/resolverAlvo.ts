import { alturaDoItem, larguraDoItem, profundidadeDoItem } from "@/lib/orcamento";
import type { ResolvedorItens } from "@/lib/engine/parede";
import type { Conjunto } from "@/lib/engine/conjunto";
import type { AlvoResolvido, ElementoContinuo, ModuloResolvido } from "@/lib/engine/elemento-continuo/types";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — extraído de
// `components/ambientes/AmbientesLab.tsx` (função local `resolverAlvoElemento`,
// não exportada, Task 13.2c). Vira função pura compartilhada porque a Task
// 13.4 precisa da MESMA regra de resolução de alvo (Modelo de Domínio, Seção
// 3.4: `AlvoElementoContinuo` = `{conjuntoId}` bloco inteiro ou `{moduloId}`
// módulo isolado) para montar o plano de corte/lista de material do
// orçamento inteiro — sem duplicar a lógica em dois componentes.
//
// Fica em `lib/ambiente/` (não em `lib/engine/elemento-continuo/`, a outra
// opção do contrato) para evitar um ciclo de import: esta função depende de
// `larguraDoItem`/`alturaDoItem`/`profundidadeDoItem` (`lib/orcamento.ts`),
// e `lib/orcamento.ts` já importa de `lib/engine/elemento-continuo` (para
// `explodeElementoContinuo`/tipos) — colocar o resolver ali criaria
// `orcamento.ts -> elemento-continuo/index.ts -> resolverAlvo.ts ->
// orcamento.ts`. `lib/ambiente/` não é importado por `lib/orcamento.ts`, e é
// exatamente a camada "olha Conjunto/Parede/os itens do orçamento" que o
// comentário de `AlvoResolvido` (`lib/engine/elemento-continuo/types.ts`)
// descreve como "responsabilidade de quem monta este objeto" — não do motor.
//
// Continua sendo I/O de domínio puro (sem estado de UI, sem `useMemo`/hooks):
// recebe o `elemento`, o mapa de módulos do orçamento (`ResolvedorItens`) e
// os Conjuntos já finais (detecção automática + overrides de junção
// aplicados) e devolve as dimensões já resolvidas — ou `null` quando o alvo
// não existe mais (módulo/conjunto removido depois que o Elemento Contínuo
// foi criado).
//
// Decisão de design herdada da 13.2c (documentada de novo aqui porque o
// comentário original ficava só em `AmbientesLab.tsx`, junto do JSX — Seção
// 3.5 do Modelo de Domínio não fecha isso): tamponamento SEMPRE mira um único
// módulo (a extremidade exposta), nunca o bloco inteiro — mesmo quando o
// `alvo` de um tampo/rodapé/fechamento no mesmo Conjunto é `{conjuntoId}`.
// Tampo/rodapé/fechamento somam TODOS os itens do bloco (ou o único item, se
// o alvo for um módulo isolado).
export function resolverAlvoElemento(
  elemento: ElementoContinuo,
  resolvedor: ResolvedorItens,
  conjuntos: Conjunto[]
): AlvoResolvido | null {
  function moduloResolvidoDe(itemId: string): ModuloResolvido | null {
    const modulo = resolvedor.get(itemId);
    if (!modulo) return null;
    return {
      largura: larguraDoItem(modulo),
      profundidade: profundidadeDoItem(modulo),
      altura: alturaDoItem(modulo),
    };
  }

  if (elemento.tipo === "tamponamento") {
    if (!("moduloId" in elemento.alvo)) return null;
    const modulo = moduloResolvidoDe(elemento.alvo.moduloId);
    return modulo ? { moduloExtremidade: modulo } : null;
  }

  const alvo = elemento.alvo;
  const ids =
    "conjuntoId" in alvo
      ? (conjuntos.find((c) => c.id === alvo.conjuntoId)?.itensIds ?? [])
      : [alvo.moduloId];
  const itens = ids.map(moduloResolvidoDe).filter((m): m is ModuloResolvido => m !== null);
  return itens.length ? { itens } : null;
}
