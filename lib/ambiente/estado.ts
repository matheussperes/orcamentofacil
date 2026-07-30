// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md) — estado profundo de
// "Ambientes" (Parede + módulos posicionados + elementos contínuos + alturas
// de faixa), extraído de `AmbientesLab` para ser o contrato de PROPS entre o
// componente presentacional (`components/ambientes/AmbientesLab.tsx`) e cada
// "dono de I/O" que agora existe:
//  - `AmbientesTabConectada` (Supabase, `/orcamento/[id]`, real) —
//    `lib/ambiente/carregar.ts` + `lib/ambiente/salvar.ts`.
//  - `AmbientesTabMock` (harness `/dev/preview/orcamento`, sem I/O nenhum).
//  - `AmbientesLabStandalone` (laboratório `/ambientes`, localStorage —
//    `lib/ambiente/persistenciaLocal.ts`).
// `AmbientesLab` em si só recebe/devolve este shape via props — não sabe de
// onde veio nem para onde vai (Supabase, localStorage ou nada).
//
// Diferença de escopo em relação à Task 13.3c: `itensColocados` (com
// `presetId` de UI) deixou de existir como estado. Agora `modulos` guarda os
// `ModuloOrcamento[]` REAIS (cópia do preset feita no momento de posicionar,
// com um itemId de instância — ver `AmbientesLab.adicionarItem`), e
// `parede.itens` (`ItemPosicionado[]`) guarda só as POSIÇÕES que referenciam
// esses itemIds — exatamente o mapeamento domínio→tabelas do contrato
// (`orcamento.itens` = módulos; `parede.itens` = posições).

import type { AlturasFaixas, Parede } from "@/lib/engine/parede/types";
import type { ElementoContinuo } from "@/lib/engine/elemento-continuo/types";
import type { OverrideJuncao } from "@/lib/engine/conjunto";
import type { ModuloOrcamento } from "@/lib/orcamento";

export interface EstadoAmbiente {
  /** altura/largura/elementos (ElementoParede[]) + itens (ItemPosicionado[],
   * só posição — itemId/x/faixa). Mapeia 1:1 pra tabela `parede` (exceto
   * `overrides_juncao`, que é o campo `overrides` abaixo). */
  parede: Parede;
  /** Módulos REAIS copiados do preset ao posicionar — mapeia pra
   * `orcamento.itens` (jsonb `ModuloOrcamento[]`). */
  modulos: ModuloOrcamento[];
  /** As 4 alturas do perfil da organização. ATENÇÃO: é dado de nível ORG
   * (`organizacao.alturas_padrao`), não por orçamento — ver
   * `lib/ambiente/carregar.ts`/`lib/ambiente/salvar.ts`. Salvar aqui
   * sobrescreve o perfil de alturas de TODA a marcenaria, não só deste
   * orçamento (decisão do Maestro, contrato 13.3d). */
  alturas: AlturasFaixas;
  /** Mapeia pra N linhas de `elemento_continuo` (sincronizadas por
   * delete+insert do conjunto inteiro a cada salvamento — ver
   * `lib/ambiente/salvar.ts`). */
  elementosContinuos: ElementoContinuo[];
  /** Overrides do handle de junção — mapeia pra `parede.overrides_juncao`. */
  overrides: OverrideJuncao[];
}

export interface ResultadoSalvarAmbiente {
  ok: boolean;
  /** Mensagem legível (Design-System Seção 11) — só presente quando `ok`
   * é `false`. */
  erro?: string;
}

export function paredeInicial(): Parede {
  return { id: "parede-1", largura: 3000, altura: 2700, elementos: [], itens: [] };
}

export function alturasIniciais(): AlturasFaixas {
  return { alturaRodape: 100, alturaBancada: 900, alturaInstalacaoAereo: 1400, peDireito: 2700 };
}

export function estadoAmbientePadrao(): EstadoAmbiente {
  return {
    parede: paredeInicial(),
    modulos: [],
    alturas: alturasIniciais(),
    elementosContinuos: [],
    overrides: [],
  };
}
