import { estadoAmbientePadrao, type EstadoAmbiente } from "./estado";

// Task 13.3d — o laboratório standalone `/ambientes` (`app/ambientes/page.tsx`)
// não tem orçamento pai (não existe `orcamento_id` pra gravar em
// `ambiente`/`elemento_continuo`), então continua com o mecanismo local da
// Task 13.3c em vez de migrar pro Supabase — decisão documentada no relatório
// da 13.3d ("o que fez com o localStorage"). Único consumidor:
// `components/ambientes/AmbientesLabStandalone.tsx`.
//
// Nota de migração: o formato salvo aqui mudou (Task 13.3d removeu
// `itensColocados`/`presetId` em favor de `modulos: ModuloOrcamento[]` +
// `parede.itens` só com posição — ver `lib/ambiente/estado.ts`). Um blob
// salvo por uma sessão anterior à 13.3d não bate com este shape; `parsed.modulos`
// não existe nesse formato antigo e cai no array vazio (default) — a parede
// carregada pode ter posições (`parede.itens`) sem módulo correspondente, que
// o motor já trata como "item sem módulo" (mesmo comportamento defensivo de
// `lib/engine/parede/validar.ts`), não como erro. Não há usuário real
// afetado por isso hoje (produto pré-lançamento).
//
// Task 2.3-2.6 — mesmo espírito para a virada singleton→lista: um blob salvo
// antes desta task tem `parede` (singular), não `ambientes`. `parsed.ambientes`
// não existe nesse formato antigo e cai no default (1 ambiente/1 parede),
// mesmo tratamento defensivo de qualquer campo ausente aqui.

function chaveLocal(escopo: string): string {
  return `ambientes:${escopo}:estado`;
}

export function carregarEstadoLocal(escopo: string): EstadoAmbiente {
  if (typeof window === "undefined") return estadoAmbientePadrao();
  try {
    const bruto = window.localStorage.getItem(chaveLocal(escopo));
    if (!bruto) return estadoAmbientePadrao();
    const parsed = JSON.parse(bruto) as Partial<EstadoAmbiente>;
    const padrao = estadoAmbientePadrao();
    return {
      ambientes: parsed.ambientes ?? padrao.ambientes,
      modulos: parsed.modulos ?? padrao.modulos,
      alturas: parsed.alturas ?? padrao.alturas,
      elementosContinuos: parsed.elementosContinuos ?? padrao.elementosContinuos,
      overrides: parsed.overrides ?? padrao.overrides,
    };
  } catch {
    return estadoAmbientePadrao();
  }
}

export function salvarEstadoLocal(escopo: string, estado: EstadoAmbiente): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(chaveLocal(escopo), JSON.stringify(estado));
}
