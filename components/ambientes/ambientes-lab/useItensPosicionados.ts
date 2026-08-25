"use client";

import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  calcularVizinhos,
  converterVaoParaX,
  type Faixa,
  type ItemPosicionado,
  type ReferenciaVao,
  type ResolvedorItens,
} from "@/lib/engine/parede";
import type { ParedeComMeta } from "@/lib/ambiente/estado";
import { idDoItem, type ModuloOrcamento } from "@/lib/orcamento";
import type { BoxModule, TipoPuxador } from "@/lib/engine/box/types";
import type { BoxPreset } from "@/lib/boxPresets";
import { novoItemId } from "../AmbientesLab.helpers";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Formulário
 * de "adicionar item posicionado" (Task 2.19-2.23) — personaliza a instância
 * copiada do preset no momento da inserção, sem nunca tocar o preset da
 * biblioteca. */
export function useItensPosicionados(params: {
  parede: ParedeComMeta;
  setParede: Dispatch<SetStateAction<ParedeComMeta>>;
  modulos: ModuloOrcamento[];
  setModulos: Dispatch<SetStateAction<ModuloOrcamento[]>>;
  presets: BoxPreset[];
  marcarAlteracao: () => void;
}) {
  const { parede, setParede, modulos, setModulos, presets, marcarAlteracao } = params;

  const [presetSelecionado, setPresetSelecionado] = useState<string>("");
  const [faixaSelecionada, setFaixaSelecionada] = useState<Faixa | undefined>(undefined);
  // Task 2.18 (front) — entrada em VÃO até o vizinho, não X absoluto (Modelo
  // de Domínio 3.1.1). `vaoItem`/`refVaoItem` são só o valor digitado; o `x`
  // absoluto gravado em `ItemPosicionado` vem de `converterVaoParaX`.
  const [vaoItem, setVaoItem] = useState(0);
  const [refVaoItem, setRefVaoItem] = useState<ReferenciaVao>("esquerda");
  const [erroVaoItem, setErroVaoItem] = useState<string | null>(null);

  // Task 2.19-2.23 (front) — personalização de instância no momento da
  // inserção: copia os valores do preset pro estado local, editável, sem
  // nunca tocar o preset da biblioteca (mesmo espírito da Task 2.12).
  const [larguraItem, setLarguraItem] = useState(0);
  const [alturaItem, setAlturaItem] = useState(0);
  const [profundidadeItem, setProfundidadeItem] = useState(0);
  const [corCaixaItem, setCorCaixaItem] = useState("");
  const [espessuraCaixaItem, setEspessuraCaixaItem] = useState(18);
  const [corPortasItem, setCorPortasItem] = useState("");
  const [espessuraPortasItem, setEspessuraPortasItem] = useState(18);
  const [temFundoItem, setTemFundoItem] = useState(true);
  const [puxadorItem, setPuxadorItem] = useState<TipoPuxador>("haste");

  // Task 2.19-2.23 (front) — repopula os campos de personalização a partir
  // do preset sempre que a seleção muda, pra nunca vazar valor customizado
  // do módulo anterior pro novo. Cor/espessura de porta seguem a cadeia de
  // fallback: override de instância do preset > material do 1º grupo de
  // porta > cor/espessura da caixa (só usado como default de exibição —
  // fica oculto se o preset não tem nenhum grupo de porta).
  useEffect(() => {
    const preset = presets.find((p) => p.id === presetSelecionado);
    if (!preset) return;
    const box = preset.box;
    const materialPortas = box.overridePortas ?? box.portas[0]?.material ?? box.caixa;
    setLarguraItem(box.largura);
    setAlturaItem(box.altura);
    setProfundidadeItem(box.profundidade);
    setCorCaixaItem(box.caixa.cor);
    setEspessuraCaixaItem(box.caixa.espessura);
    setCorPortasItem(materialPortas.cor);
    setEspessuraPortasItem(materialPortas.espessura);
    setTemFundoItem(box.temFundo);
    setPuxadorItem(box.puxador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetSelecionado]);

  const resolvedor: ResolvedorItens = useMemo(() => {
    const m = new Map<string, ModuloOrcamento>();
    for (const modulo of modulos) m.set(idDoItem(modulo), modulo);
    return m;
  }, [modulos]);

  // Ao posicionar: COPIA o box do preset pra um módulo de instância novo (id
  // de instância, não o id do preset — mesma decisão da Task 13.3c, agora
  // persistida de verdade em `orcamento.itens`) e guarda só a POSIÇÃO em
  // `parede.itens` (contrato: "orcamento.itens = módulos; parede.itens =
  // posições referenciando esses itemIds").
  function adicionarItem() {
    if (!faixaSelecionada) return;
    if (!presetSelecionado) return;
    const preset = presets.find((p) => p.id === presetSelecionado);
    if (!preset) return;
    const faixa = faixaSelecionada;

    const largura = larguraItem;
    // Item ainda não posicionado: `x` provisório "encostado na borda direita
    // da parede" — a convenção que `calcularVizinhos` documenta como a que
    // produz os vizinhos corretos pra entrada (Seção 3.1.1).
    const vizinhos = calcularVizinhos(parede, resolvedor, {
      faixa,
      x: parede.largura - largura,
      largura,
    });
    const resultado = converterVaoParaX(vaoItem, refVaoItem, largura, vizinhos);
    if (!resultado.ok) {
      setErroVaoItem(resultado.mensagem);
      return;
    }

    const itemId = novoItemId();
    const box: BoxModule = {
      ...preset.box,
      id: itemId,
      largura: larguraItem,
      altura: alturaItem,
      profundidade: profundidadeItem,
      caixa: { cor: corCaixaItem, espessura: espessuraCaixaItem },
      ...(preset.box.portas.length > 0
        ? { overridePortas: { cor: corPortasItem, espessura: espessuraPortasItem } }
        : {}),
      temFundo: temFundoItem,
      puxador: puxadorItem,
    };
    const modulo: ModuloOrcamento = { origem: "custom_box", box };
    const posicao: ItemPosicionado = {
      itemId,
      x: resultado.x,
      faixa,
      refEntrada: refVaoItem,
    };

    setModulos((ms) => [...ms, modulo]);
    setParede((p) => ({ ...p, itens: [...p.itens, posicao] }));
    marcarAlteracao();
    setVaoItem(0);
    setErroVaoItem(null);
  }
  function removerItem(itemId: string) {
    setModulos((ms) => ms.filter((m) => idDoItem(m) !== itemId));
    setParede((p) => ({ ...p, itens: p.itens.filter((i) => i.itemId !== itemId) }));
    marcarAlteracao();
  }

  const presetItemAtual = presets.find((p) => p.id === presetSelecionado);
  const temPortasNoPresetAtual = (presetItemAtual?.box.portas.length ?? 0) > 0;

  return {
    resolvedor,
    presetSelecionado,
    setPresetSelecionado,
    faixaSelecionada,
    setFaixaSelecionada,
    vaoItem,
    setVaoItem,
    refVaoItem,
    setRefVaoItem,
    erroVaoItem,
    larguraItem,
    setLarguraItem,
    alturaItem,
    setAlturaItem,
    profundidadeItem,
    setProfundidadeItem,
    corCaixaItem,
    setCorCaixaItem,
    espessuraCaixaItem,
    setEspessuraCaixaItem,
    corPortasItem,
    setCorPortasItem,
    espessuraPortasItem,
    setEspessuraPortasItem,
    temFundoItem,
    setTemFundoItem,
    puxadorItem,
    setPuxadorItem,
    adicionarItem,
    removerItem,
    temPortasNoPresetAtual,
  };
}

