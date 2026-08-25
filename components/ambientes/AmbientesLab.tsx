"use client";

// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md) — componente
// PRESENTACIONAL: recebe o estado profundo de Ambientes (parede, alturas,
// módulos posicionados, elementos contínuos, overrides de junção) via prop
// `estadoInicial` e devolve mudanças via `onSalvar` (chamado só quando o
// usuário clica em "Salvar alterações" — nunca autosave). Este componente
// NÃO SABE de onde o estado veio nem para onde `onSalvar` grava — pode ser
// Supabase (`AmbientesTabConectada`, `/orcamento/[id]`), localStorage
// (`AmbientesLabStandalone`, laboratório `/ambientes`) ou nada
// (`AmbientesTabMock`, harness `/dev/preview/orcamento`).
//
// Task R.3a — decomposição pura (zero mudança de comportamento/aparência):
// o estado e a lógica que viviam neste arquivo (2.250 linhas) foram
// extraídos para `AmbientesLab.helpers.ts` (funções puras),
// `AmbientesLab.constants.ts` (rótulos/listas fixas),
// `AmbientesLab.types.ts` (props/tipos) e `ambientes-lab/*` (hooks de
// estado por domínio + subcomponentes de seção). Este arquivo só compõe.
import { useRef } from "react";
import type { AmbientesLabProps } from "./AmbientesLab.types";
import { useCatalogoEPresets } from "./ambientes-lab/useCatalogoEPresets";
import { useResultadoSalvar, useHandleSalvar } from "./ambientes-lab/useHandleSalvar";
import { useSelecaoAmbiente } from "./ambientes-lab/useSelecaoAmbiente";
import { useAlturas } from "./ambientes-lab/useAlturas";
import { useElementosParede } from "./ambientes-lab/useElementosParede";
import { useItensPosicionados } from "./ambientes-lab/useItensPosicionados";
import { useConjuntos } from "./ambientes-lab/useConjuntos";
import { useElementosContinuos } from "./ambientes-lab/useElementosContinuos";
import { SecaoAmbientesEParedes } from "./ambientes-lab/SecaoAmbientesEParedes";
import { SecaoParedeEAlturasPerfil } from "./ambientes-lab/SecaoParedeEAlturasPerfil";
import { SecaoAlturasParede } from "./ambientes-lab/SecaoAlturasParede";
import { SecaoElementosParede } from "./ambientes-lab/SecaoElementosParede";
import { SecaoItensPosicionados } from "./ambientes-lab/SecaoItensPosicionados";
import { SecaoElevacaoConjunto } from "./ambientes-lab/SecaoElevacaoConjunto";
import { SecaoBlocosEElementosContinuos } from "./ambientes-lab/SecaoBlocosEElementosContinuos";
import { SecaoValidacaoESalvar } from "./ambientes-lab/SecaoValidacaoESalvar";

// AmbientesLab.test.ts importa as funções puras a partir deste módulo — a
// implementação real vive em AmbientesLab.helpers.ts (Task R.3a).
export * from "./AmbientesLab.helpers";

export function AmbientesLab({
  estadoInicial,
  onSalvar,
  onMutarAmbientes,
  orcamentoId,
  presetsElementoParede = [],
  linhasProposta = [],
}: AmbientesLabProps) {
  const catalogoPresets = useCatalogoEPresets();
  const { salvando, setSalvando, resultadoSalvar, setResultadoSalvar, marcarAlteracao } = useResultadoSalvar();

  // Troca de seleção (ambiente/parede) precisa resetar a seleção de
  // Conjunto (dono: `elementosContinuosHook`) e o formulário de elemento de
  // parede (dono: `elementosParedeHook`) — hooks que só existem DEPOIS de
  // `useSelecaoAmbiente` (dependem de `parede`/`setParede`). Um ref resolve
  // a ordem: `useSelecaoAmbiente` só invoca o callback dentro de handlers de
  // clique, nunca durante o render, então por lá o ref já está com a versão
  // mais recente (populada no fim deste componente, mesmo render).
  const aoTrocarSelecaoRef = useRef<() => void>(() => {});

  const selecao = useSelecaoAmbiente({
    estadoInicial,
    onMutarAmbientes,
    marcarAlteracao,
    aoTrocarSelecao: () => aoTrocarSelecaoRef.current(),
  });

  const alturasHook = useAlturas({
    alturasIniciais: estadoInicial.alturas,
    parede: selecao.parede,
    atualizarParede: selecao.atualizarParede,
    marcarAlteracao,
  });

  const elementosParedeHook = useElementosParede({
    parede: selecao.parede,
    setParede: selecao.setParede,
    presetsElementoParede,
    marcarAlteracao,
  });

  const itensHook = useItensPosicionados({
    parede: selecao.parede,
    setParede: selecao.setParede,
    modulos: selecao.modulos,
    setModulos: selecao.setModulos,
    presets: catalogoPresets.presets,
    marcarAlteracao,
  });

  const conjuntosHook = useConjuntos({
    parede: selecao.parede,
    alturas: alturasHook.alturas,
    resolvedor: itensHook.resolvedor,
    overridesIniciais: estadoInicial.overrides,
    linhasProposta,
    marcarAlteracao,
  });

  const elementosContinuosHook = useElementosContinuos({
    elementosContinuosIniciais: estadoInicial.elementosContinuos,
    resolvedor: itensHook.resolvedor,
    conjuntosFinais: conjuntosHook.conjuntosFinais,
    catalogo: catalogoPresets.catalogo,
    marcarAlteracao,
  });

  aoTrocarSelecaoRef.current = () => {
    elementosContinuosHook.setSelecao(null);
    elementosParedeHook.limparFormularioElemento();
    marcarAlteracao();
  };

  const { handleSalvar } = useHandleSalvar({
    onSalvar,
    ambientes: selecao.ambientes,
    ambienteSelecionadoId: selecao.ambienteSelecionadoId,
    paredeSelecionadaId: selecao.paredeSelecionadaId,
    parede: selecao.parede,
    modulos: selecao.modulos,
    alturas: alturasHook.alturas,
    elementosContinuos: elementosContinuosHook.elementosContinuos,
    overrides: conjuntosHook.overrides,
    setAmbientes: selecao.setAmbientes,
    setAmbienteSelecionadoId: selecao.setAmbienteSelecionadoId,
    setParedeSelecionadaId: selecao.setParedeSelecionadaId,
    setParede: selecao.setParede,
    setSalvando,
    setResultadoSalvar,
  });

  return (
    <div className="flex flex-col gap-lg">
      <SecaoAmbientesEParedes selecao={selecao} />

      <SecaoParedeEAlturasPerfil selecao={selecao} alturasHook={alturasHook} />

      <SecaoAlturasParede alturasHook={alturasHook} />

      <SecaoElementosParede parede={selecao.parede} form={elementosParedeHook} />

      <SecaoItensPosicionados
        parede={selecao.parede}
        itensHook={itensHook}
        conjuntosHook={conjuntosHook}
        presets={catalogoPresets.presets}
        catalogo={catalogoPresets.catalogo}
        orcamentoId={orcamentoId}
      />

      <SecaoElevacaoConjunto
        parede={selecao.parede}
        alturas={alturasHook.alturas}
        conjuntosHook={conjuntosHook}
        elementosParedeHook={elementosParedeHook}
      />

      <SecaoBlocosEElementosContinuos
        conjuntosHook={conjuntosHook}
        elementosContinuosHook={elementosContinuosHook}
        catalogo={catalogoPresets.catalogo}
      />

      <SecaoValidacaoESalvar
        warnings={conjuntosHook.warnings}
        salvando={salvando}
        resultadoSalvar={resultadoSalvar}
        handleSalvar={handleSalvar}
      />
    </div>
  );
}
