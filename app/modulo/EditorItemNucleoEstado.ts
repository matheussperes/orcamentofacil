// Task R.3c — decomposição pura de `EditorItemNucleo.tsx`: todo o estado
// bruto e os valores derivados (custo, plano de corte, seleção em edição)
// isolados num hook próprio, sem nenhuma mudança de comportamento. Os
// handlers que mutam esse estado ficam em `EditorItemNucleoAcoes.ts`.

import { useEffect, useMemo, useState } from "react";
import type { ModuleViewerAngulo } from "@/components/modulo/ModuleViewer";
import type { ModoSelecao } from "../components/BoxCanvas";
import { corParaHex } from "../components/ModulePreview";
import { calcularOrcamentoMisto, type ModuloOrcamento } from "@/lib/orcamento";
import type { BoxModule, GrupoPortas } from "@/lib/engine/box";
import { acharVao } from "@/lib/engine/box/tree";
import type { Placa } from "@/lib/engine/placa/types";
import { catalogoParaPrecos, coresDisponiveis, type Catalogo } from "@/lib/catalog";
import { buscarCatalogoReal } from "@/lib/produto/buscar";
import { urlPublicaTextura } from "@/lib/produto/texturas";
import { buscarEspessuraSerraReal } from "@/lib/organizacao/buscarKerf";
import { montarLinhasInsumos } from "@/lib/insumos";
import { calcularPreco } from "@/lib/engine/pricing";
import {
  COMERCIAL_PADRAO,
  MATERIAIS_PADRAO,
  PARAMETROS_FABRICA_PADRAO,
} from "@/lib/engine/defaults";
import { listarCategorias } from "@/lib/categorias";
import { usePlanoDeCorte } from "@/lib/engine/box/usarPlanoDeCorte";
import type { GavetaEmEdicao } from "./GavetasCard";
import { ordemSecoesPlaca, type SecaoPlaca } from "./secoes";
import { caixaInicial, placaInicial } from "./EditorItemNucleoHelpers";
import {
  ORDEM_SECOES,
  type DivisaoSel,
  type ResultadoSalvarItem,
  type Secao,
} from "./EditorItemNucleoTipos";

export function useEditorItemNucleoEstado(estadoInicial: ModuloOrcamento) {
  // Origem fixa (nunca muda durante a vida deste componente — ver nota de
  // escopo no topo de EditorItemNucleo.tsx).
  const [origem] = useState(estadoInicial.origem);

  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);
  // Task 3.1/3.3 (front) — kerf real lido CLIENT-SIDE (ver comentário
  // completo na versão anterior deste hook, dentro do componente).
  const [kerfMm, setKerfMm] = useState(3);
  const [box, setBox] = useState<BoxModule>(() =>
    estadoInicial.origem === "custom_box" ? estadoInicial.box : caixaInicial("Branco TX", "Cozinha")
  );
  const [placa, setPlaca] = useState<Placa>(() =>
    estadoInicial.origem === "placa" ? estadoInicial.placa : placaInicial("Branco TX")
  );

  // Task 3.13-front — mesma fonte de cor/geometria que `BoxCanvas.tsx` já
  // consome (proibido segundo caminho de derivação, Design-System §9.6).
  const corModuleViewer = useMemo(() => corParaHex(box.caixa.cor), [box.caixa.cor]);
  const texturaUrlModuleViewer = useMemo(() => {
    const item = catalogo?.mdf.find(
      (m) => m.cor === box.caixa.cor && m.espessura === box.caixa.espessura
    );
    return item?.texturaUrl ? urlPublicaTextura(item.texturaUrl) : undefined;
  }, [catalogo, box.caixa.cor, box.caixa.espessura]);

  const [secaoAbertaBox, setSecaoAbertaBox] = useState<Secao | null>("caixa");
  const ordemPlaca = useMemo(() => ordemSecoesPlaca("placa"), []);
  const [secaoAbertaPlaca, setSecaoAbertaPlaca] = useState<SecaoPlaca | null>(ordemPlaca[0] ?? null);
  const [modoSelecao, setModoSelecao] = useState<ModoSelecao>("vaos");
  // Task 3.13-front — segundo modo do painel de visualização (Design-System
  // §9.6): "2D técnico" (default) ou "3D estático" (`ModuleViewer`).
  const [modoVisualizacao, setModoVisualizacao] = useState<"2d" | "3d">("2d");
  const [anguloModuleViewer, setAnguloModuleViewer] = useState<ModuleViewerAngulo>("isometric");
  const [multiSelecaoVaos, setMultiSelecaoVaos] = useState(false);
  const [vaosSelecionados, setVaosSelecionados] = useState<string[]>([]);
  const [divisaoSelecionada, setDivisaoSelecionada] = useState<DivisaoSel | null>(null);
  const [portaSelecionada, setPortaSelecionada] = useState<string | null>(null);
  const [vaoGavetaSelecionado, setVaoGavetaSelecionado] = useState<string | null>(null);

  const [salvando, setSalvando] = useState(false);
  const [resultadoSalvar, setResultadoSalvar] = useState<ResultadoSalvarItem | null>(null);

  // Task 13.7b — catálogo REAL da organização (Supabase, `produto`).
  useEffect(() => {
    let cancelado = false;
    buscarCatalogoReal().then((c) => {
      if (!cancelado) setCatalogo(c);
    });
    buscarEspessuraSerraReal().then((kerf) => {
      if (!cancelado) setKerfMm(kerf);
    });
    setCategorias(listarCategorias());
    return () => {
      cancelado = true;
    };
  }, []);

  const cores = useMemo(
    () => (catalogo ? coresDisponiveis(catalogo) : ["Branco TX", "Louro Freijó"]),
    [catalogo]
  );

  // Item unificado sendo editado agora (union `ModuloOrcamento`, Modelo de
  // Domínio Seção 1). Alimenta `calcularOrcamentoMisto`.
  const moduloAtual: ModuloOrcamento = useMemo(
    () => (origem === "custom_box" ? { origem: "custom_box", box } : { origem: "placa", placa }),
    [origem, box, placa]
  );

  // Custo ao vivo (reaproveita todo o pipeline, via calcularOrcamentoMisto).
  const resultado = useMemo(() => {
    const precos = catalogo ? catalogoParaPrecos(catalogo) : undefined;
    const engine = calcularOrcamentoMisto({
      ambiente: { tipo: box.categoria ?? "Geral", materiais: MATERIAIS_PADRAO },
      parametros: PARAMETROS_FABRICA_PADRAO,
      itens: [moduloAtual],
    });
    const financeiro = calcularPreco(engine, COMERCIAL_PADRAO, precos);
    const insumos = precos
      ? montarLinhasInsumos(engine, precos, { incluirServicos: true })
      : null;
    return { engine, financeiro, insumos };
  }, [moduloAtual, catalogo, box.categoria]);

  // Task 7.1 — Stepper (Seção 6.5) é só leitura de `secaoAbertaBox`/
  // ORDEM_SECOES. Mesmo padrão replicado para Placa com `ordemPlaca`.
  const stepperIndexBox = secaoAbertaBox
    ? ORDEM_SECOES.indexOf(secaoAbertaBox)
    : ORDEM_SECOES.length - 1;
  const stepperIndexPlaca = secaoAbertaPlaca
    ? ordemPlaca.indexOf(secaoAbertaPlaca)
    : ordemPlaca.length - 1;

  const pecas = useMemo(() => resultado.engine.porModulo[0]?.pecas ?? [], [resultado]);
  const { grupos, calculando: calculandoPlanoDeCorte } = usePlanoDeCorte(pecas, kerfMm);

  // Grupo de porta / vão com gaveta atualmente selecionado no canvas, pra
  // carregar no formulário de edição (ver PortasCard/GavetasCard).
  const grupoPortaEmEdicao: GrupoPortas | null = useMemo(
    () => (portaSelecionada ? box.portas.find((g) => g.id === portaSelecionada) ?? null : null),
    [portaSelecionada, box.portas]
  );
  const gavetaEmEdicao: GavetaEmEdicao | null = useMemo(() => {
    if (!vaoGavetaSelecionado) return null;
    const node = acharVao(box.raiz, vaoGavetaSelecionado);
    if (!node || node.split !== "none" || node.content?.tipo !== "espaco" || node.content.frente.tipo !== "gaveta") {
      return null;
    }
    const f = node.content.frente;
    return {
      vaoId: vaoGavetaSelecionado,
      config: {
        interna: f.interna,
        qtd: f.qtd,
        profundidade: f.profundidade,
        cor: f.interna ? cores[0] ?? "Branco TX" : f.corFrente ?? cores[0] ?? "Branco TX",
        espessura: f.interna ? 18 : f.espessuraFrente ?? 18,
      },
    };
  }, [vaoGavetaSelecionado, box.raiz, cores]);

  return {
    origem,
    catalogo,
    categorias,
    kerfMm,
    box,
    setBox,
    placa,
    setPlaca,
    corModuleViewer,
    texturaUrlModuleViewer,
    secaoAbertaBox,
    setSecaoAbertaBox,
    ordemPlaca,
    secaoAbertaPlaca,
    setSecaoAbertaPlaca,
    modoSelecao,
    setModoSelecao,
    modoVisualizacao,
    setModoVisualizacao,
    anguloModuleViewer,
    setAnguloModuleViewer,
    multiSelecaoVaos,
    setMultiSelecaoVaos,
    vaosSelecionados,
    setVaosSelecionados,
    divisaoSelecionada,
    setDivisaoSelecionada,
    portaSelecionada,
    setPortaSelecionada,
    vaoGavetaSelecionado,
    setVaoGavetaSelecionado,
    salvando,
    setSalvando,
    resultadoSalvar,
    setResultadoSalvar,
    cores,
    moduloAtual,
    resultado,
    stepperIndexBox,
    stepperIndexPlaca,
    pecas,
    grupos,
    calculandoPlanoDeCorte,
    grupoPortaEmEdicao,
    gavetaEmEdicao,
  };
}

export type EditorItemNucleoEstado = ReturnType<typeof useEditorItemNucleoEstado>;
