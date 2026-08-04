import { detectarConjuntos, aplicarOverrides } from "@/lib/engine/conjunto";
import type { ResolvedorItens } from "@/lib/engine/parede";
import { calcularOrcamentoMisto, idDoItem, type ElementoContinuoResolvido } from "@/lib/orcamento";
import { MATERIAIS_PADRAO, PARAMETROS_FABRICA_PADRAO } from "@/lib/engine/defaults";
import type { EngineOutput } from "@/lib/engine/types";
import { resolverAlvoElemento } from "./resolverAlvo";
import type { EstadoAmbiente } from "./estado";

// Task 13.5 (contrato .maestro/tmp/13.5-contract.md) — extraído de
// `components/orcamento/CorteMaterialLab.tsx` (Task 13.4): bloco que monta o
// `EngineOutput` do ORÇAMENTO INTEIRO (todos os `modulos`/`elementosContinuos`
// de `EstadoAmbiente`, não uma seleção) — resolvedor de itens ->
// `detectarConjuntos`/`aplicarOverrides` -> elementos contínuos resolvidos via
// `resolverAlvoElemento` -> `calcularOrcamentoMisto`. A Task 13.5 (aba
// Financeiro) precisa exatamente do mesmo `EngineOutput` que a Task 13.4 (aba
// Corte & Material) já calculava — em vez de duplicar o bloco pela terceira
// vez (a segunda duplicação, `resolverAlvoElemento`, já foi corrigida na
// 13.4), esta função pura vira a fonte única para as duas abas.
//
// Mesmo contrato de erro que `CorteMaterialLab` já usava inline: nunca lança
// — captura qualquer exceção de `detectarConjuntos`/`aplicarOverrides`/
// `calcularOrcamentoMisto` (ex.: posição inválida) e devolve `{ok:false}`,
// pra cada aba decidir seu próprio estado de erro (Design-System Seção 8).
export type ResultadoEngineOrcamento = { ok: true; engine: EngineOutput } | { ok: false };

export function calcularEngineOrcamento(estadoInicial: EstadoAmbiente): ResultadoEngineOrcamento {
  try {
    const resolvedor: ResolvedorItens = new Map(estadoInicial.modulos.map((m) => [idDoItem(m), m]));
    // `estadoInicial.alturas` é o perfil bruto, sem passar por `alturasEfetivas`
    // — no-op hoje porque nenhuma UI escreve `parede.alturasOverride` (Task
    // 0.4/Lote 0). Passa a importar quando o Lote 2 ligar essa UI.
    const conjuntosAutomaticos = detectarConjuntos(estadoInicial.parede, estadoInicial.alturas, resolvedor);
    const conjuntosFinais = aplicarOverrides(
      conjuntosAutomaticos,
      estadoInicial.parede.itens,
      estadoInicial.overrides
    );
    const elementosContinuosResolvidos: ElementoContinuoResolvido[] = estadoInicial.elementosContinuos
      .map((elemento) => {
        const alvo = resolverAlvoElemento(elemento, resolvedor, conjuntosFinais);
        return alvo ? { elemento, alvo } : null;
      })
      .filter((v): v is ElementoContinuoResolvido => v !== null);

    const engine = calcularOrcamentoMisto({
      ambiente: { tipo: "ambiente", materiais: MATERIAIS_PADRAO },
      parametros: PARAMETROS_FABRICA_PADRAO,
      itens: estadoInicial.modulos,
      elementosContinuos: elementosContinuosResolvidos,
    });
    return { ok: true, engine };
  } catch (erro) {
    console.error("[calcularEngineOrcamento] falha ao calcular o orçamento:", erro);
    return { ok: false };
  }
}
