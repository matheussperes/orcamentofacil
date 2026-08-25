"use client";

import { useEffect, useMemo, useState } from "react";
import type { ResolvedorItens } from "@/lib/engine/parede";
import type { Conjunto } from "@/lib/engine/conjunto";
import {
  ESPESSURAS_VALIDAS_POR_MODELO_TAMPO,
  POSICOES_VALIDAS,
  type AlvoElementoContinuo,
  type ElementoContinuo,
  type PosicaoElemento,
  type SelecaoTampo,
  type TipoElementoContinuo,
} from "@/lib/engine/elemento-continuo/types";
import { trocarModeloTampo } from "@/lib/engine/elemento-continuo/explode";
import {
  calcularOrcamentoMisto,
  type ElementoContinuoResolvido,
} from "@/lib/orcamento";
import { MATERIAIS_PADRAO, PARAMETROS_FABRICA_PADRAO } from "@/lib/engine/defaults";
import type { BoxMaterial } from "@/lib/engine/box/types";
import { coresDisponiveis, espessurasDaCor, type Catalogo } from "@/lib/catalog";
import { resolverAlvoElemento } from "@/lib/ambiente/resolverAlvo";
import { chaveSelecao, montarEngrossamentoTampo, novoElementoId } from "../AmbientesLab.helpers";
import type { SelecaoAlvo } from "../AmbientesLab.types";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Seleção de
 * Conjunto/item avulso (Task 13.2c) e o painel de Elemento Contínuo (tampo,
 * rodapé, tamponamento, fechamento — Task 13.2c/3.10-3.11). */
export function useElementosContinuos(params: {
  elementosContinuosIniciais: ElementoContinuo[];
  resolvedor: ResolvedorItens;
  conjuntosFinais: Conjunto[];
  catalogo: Catalogo | null;
  marcarAlteracao: () => void;
}) {
  const { elementosContinuosIniciais, resolvedor, conjuntosFinais, catalogo, marcarAlteracao } = params;

  // Seleção de Conjunto/item avulso e os Elementos Contínuos adicionados.
  const [selecao, setSelecao] = useState<SelecaoAlvo | null>(null);
  const [elementosContinuos, setElementosContinuos] = useState<ElementoContinuo[]>(
    () => elementosContinuosIniciais
  );

  // Formulário de "adicionar elemento".
  const [novoTipoElemento, setNovoTipoElemento] = useState<TipoElementoContinuo>("tampo");
  const [novaPosicaoElemento, setNovaPosicaoElemento] = useState<PosicaoElemento>("superior");
  const [moduloTamponamento, setModuloTamponamento] = useState<string>("");
  const [corElemento, setCorElemento] = useState<string>("");
  const [espessuraElemento, setEspessuraElemento] = useState<number>(18);
  // Task 3.10–3.11 (front) — modelo do tampo, escolhido ANTES da espessura.
  // Só relevante quando `novoTipoElemento === "tampo"` (Modelo-de-Dominio
  // Seção 3.4.1); rodapé/tamponamento não têm conceito de modelo.
  const [selecaoTampo, setSelecaoTampo] = useState<SelecaoTampo>({ modelo: "simples" });

  // Itens (ordenados por x) que compõem a seleção atual — um Conjunto inteiro
  // ou um único item avulso. `conjunto.itensIds` já vem ordenado por x
  // (ver lib/engine/conjunto/detectar.ts), então o índice dentro deste array
  // já reflete a posição esquerda→direita real na parede.
  const itensDaSelecao: string[] = useMemo(() => {
    if (!selecao) return [];
    if (selecao.tipo === "item") return [selecao.itemId];
    const conjunto = conjuntosFinais.find((c) => c.id === selecao.conjuntoId);
    return conjunto ? conjunto.itensIds : [];
  }, [selecao, conjuntosFinais]);

  // Decisão de domínio (extremidade exposta — contrato Task 13.2c, ponto
  // deliberadamente em aberto na spec): `AlvoResolvido` (lib/engine/
  // elemento-continuo/types.ts) só tem a forma `{ moduloExtremidade }` (um
  // ÚNICO módulo) pra tamponamento — nunca `{ itens }` (o bloco inteiro).
  // Por isso, tamponamento SEMPRE mira um módulo específico, mesmo quando a
  // seleção é um Conjunto: a esquerda/direita só fazem sentido no módulo da
  // ponta correspondente (índice 0 / último de `itensDaSelecao`, já ordenado
  // por x); base/topo, por outro lado, não têm noção de "extremidade
  // horizontal" nenhuma — decisão adotada aqui: qualquer módulo do bloco
  // pode receber base/topo independentemente. Um item avulso (fora de
  // Conjunto) expõe os 4 lados.
  function posicoesDisponiveisTamponamento(moduloId: string): PosicaoElemento[] {
    const todas = POSICOES_VALIDAS.tamponamento;
    if (selecao?.tipo === "item") return todas;
    const idx = itensDaSelecao.indexOf(moduloId);
    if (idx === -1) return todas;
    const extremidadeEsquerda = idx === 0;
    const extremidadeDireita = idx === itensDaSelecao.length - 1;
    return todas.filter((p) => {
      if (p === "esquerda") return extremidadeEsquerda;
      if (p === "direita") return extremidadeDireita;
      return true; // base/topo — disponível pra qualquer módulo do bloco (ver decisão acima)
    });
  }

  const moduloTamponamentoAtual = moduloTamponamento || itensDaSelecao[0] || "";

  const posicoesDisponiveis: PosicaoElemento[] =
    novoTipoElemento === "tamponamento"
      ? posicoesDisponiveisTamponamento(moduloTamponamentoAtual)
      : POSICOES_VALIDAS[novoTipoElemento];

  // Task 3.10–3.11 (front) — espessuras oferecidas pro tampo, filtradas por
  // modelo (Modelo-de-Dominio Seção 3.4.1). "Simples": interseção entre o
  // catálogo real e as espessuras válidas do modelo (nunca 6mm, nunca fora da
  // tabela). "Engrossado"/"dobrado": não é catálogo-driven — vem direto de
  // `OPCOES_ESPESSURA_ENGROSSAMENTO` (fonte única, `lib/engine/elemento-continuo/types.ts`).
  const espessurasTampoSimples = (
    catalogo && corElemento ? espessurasDaCor(catalogo, corElemento) : [15, 18, 25]
  ).filter((esp) => ESPESSURAS_VALIDAS_POR_MODELO_TAMPO.simples.includes(esp));

  // Reseta o formulário (tipo/posição/módulo-alvo/material) sempre que a
  // seleção muda — evita carregar estado de um Conjunto/item anterior.
  useEffect(() => {
    setNovoTipoElemento("tampo");
    setNovaPosicaoElemento("superior");
    setModuloTamponamento("");
    if (catalogo) setCorElemento(coresDisponiveis(catalogo)[0] ?? "");
    setEspessuraElemento(18);
    setSelecaoTampo({ modelo: "simples" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveSelecao(selecao)]);

  // Task 3.10–3.11 (front) — reseta a seleção de modelo/espessura do tampo
  // sempre que o tipo do elemento deixa de ser "tampo" (mesmo padrão de reset
  // já usado pros outros campos deste formulário, useEffect acima).
  useEffect(() => {
    if (novoTipoElemento !== "tampo") {
      setSelecaoTampo({ modelo: "simples" });
    }
  }, [novoTipoElemento]);

  // Mantém a posição sempre dentro do conjunto disponível (troca de tipo,
  // troca de módulo-alvo do tamponamento etc. podem invalidar a atual).
  useEffect(() => {
    if (!posicoesDisponiveis.includes(novaPosicaoElemento)) {
      setNovaPosicaoElemento(posicoesDisponiveis[0] ?? "superior");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novoTipoElemento, moduloTamponamentoAtual, selecao]);

  function elementoPertenceASelecao(elemento: ElementoContinuo): boolean {
    if (!selecao) return false;
    if ("conjuntoId" in elemento.alvo) {
      return selecao.tipo === "conjunto" && elemento.alvo.conjuntoId === selecao.conjuntoId;
    }
    // { moduloId }: pertence à seleção se for exatamente o item avulso
    // selecionado, ou um módulo dentro do Conjunto selecionado (caso do
    // tamponamento, que sempre mira um módulo específico — ver acima).
    return selecao.tipo === "item"
      ? elemento.alvo.moduloId === selecao.itemId
      : itensDaSelecao.includes(elemento.alvo.moduloId);
  }

  const elementosDaSelecao = useMemo(
    () => elementosContinuos.filter(elementoPertenceASelecao),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [elementosContinuos, selecao, itensDaSelecao]
  );

  // Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — extraída para
  // `lib/ambiente/resolverAlvo.ts` (função pura, sem estado de UI) para ser
  // reaproveitada também por `CorteMaterialLab` (plano de corte/lista de
  // material do orçamento inteiro), sem duplicar a regra de resolução de
  // alvo em dois lugares.
  const elementosContinuosResolvidos: ElementoContinuoResolvido[] = useMemo(
    () =>
      elementosDaSelecao
        .map((elemento) => {
          const alvo = resolverAlvoElemento(elemento, resolvedor, conjuntosFinais);
          return alvo ? { elemento, alvo } : null;
        })
        .filter((v): v is ElementoContinuoResolvido => v !== null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [elementosDaSelecao, conjuntosFinais, resolvedor]
  );

  // Task 13.2c — primeira vez que `calcularOrcamentoMisto` roda dentro de
  // `/ambientes` (até aqui só existia no Editor de Item, Task 13.1). Só
  // calcula o BOM dos Elementos Contínuos da seleção atual — não replica o
  // painel de custo completo do Editor de Item (fora de escopo, ver contrato).
  const resultadoElementosContinuos = useMemo(
    () =>
      calcularOrcamentoMisto({
        ambiente: { tipo: "ambiente", materiais: MATERIAIS_PADRAO },
        parametros: PARAMETROS_FABRICA_PADRAO,
        itens: [],
        elementosContinuos: elementosContinuosResolvidos,
      }),
    [elementosContinuosResolvidos]
  );

  function adicionarElementoContinuo() {
    if (!selecao) return;
    // Task 3.10–3.11 (front) — tampo com modelo escolhido mas espessura ainda
    // não (campo limpo por `trocarModeloTampo`, ou nunca escolhida): mesma
    // disciplina de campo obrigatório dos outros seletores, não submete.
    if (novoTipoElemento === "tampo" && selecaoTampo.espessuraFinal === undefined) return;

    const cor = corElemento || (catalogo ? coresDisponiveis(catalogo)[0] : undefined) || "Branco TX";
    const espessura = novoTipoElemento === "tampo" ? selecaoTampo.espessuraFinal! : espessuraElemento;
    const material: BoxMaterial = { cor, espessura };

    let alvo: AlvoElementoContinuo;
    if (novoTipoElemento === "tamponamento") {
      if (!moduloTamponamentoAtual) return;
      alvo = { moduloId: moduloTamponamentoAtual };
    } else {
      alvo = selecao.tipo === "conjunto" ? { conjuntoId: selecao.conjuntoId } : { moduloId: selecao.itemId };
    }

    const engrossamento = novoTipoElemento === "tampo" ? montarEngrossamentoTampo(selecaoTampo) : undefined;

    const elemento: ElementoContinuo = {
      id: novoElementoId(),
      tipo: novoTipoElemento,
      alvo,
      posicao: novaPosicaoElemento,
      material,
      engrossamento,
    };
    setElementosContinuos((els) => [...els, elemento]);
    marcarAlteracao();
  }

  function removerElementoContinuo(id: string) {
    setElementosContinuos((els) => els.filter((e) => e.id !== id));
    marcarAlteracao();
  }

  return {
    selecao,
    setSelecao,
    elementosContinuos,
    novoTipoElemento,
    setNovoTipoElemento,
    novaPosicaoElemento,
    setNovaPosicaoElemento,
    moduloTamponamento,
    setModuloTamponamento,
    corElemento,
    setCorElemento,
    espessuraElemento,
    setEspessuraElemento,
    selecaoTampo,
    setSelecaoTampo,
    itensDaSelecao,
    moduloTamponamentoAtual,
    posicoesDisponiveis,
    espessurasTampoSimples,
    elementosDaSelecao,
    resultadoElementosContinuos,
    adicionarElementoContinuo,
    removerElementoContinuo,
  };
}

