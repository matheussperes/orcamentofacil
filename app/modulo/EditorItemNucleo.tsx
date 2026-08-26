"use client";

import type { ModuloOrcamento } from "@/lib/orcamento";
import { useEditorItemNucleoEstado } from "./EditorItemNucleoEstado";
import { useEditorItemNucleoAcoes } from "./EditorItemNucleoAcoes";
import { EditorItemNucleoBoxAccordion } from "./EditorItemNucleoBoxAccordion";
import { EditorItemNucleoPlacaAccordion } from "./EditorItemNucleoPlacaAccordion";
import { EditorItemNucleoPlanoCorte } from "./EditorItemNucleoPlanoCorte";
import { EditorItemNucleoBoxCanvasPanel } from "./EditorItemNucleoBoxCanvasPanel";
import { EditorItemNucleoPlacaPanel } from "./EditorItemNucleoPlacaPanel";
import { EditorItemNucleoCustoPanel, EditorItemNucleoPecasPanel } from "./EditorItemNucleoResultadoPaineis";
import type { ResultadoSalvarItem } from "./EditorItemNucleoTipos";

// Task 13.3e (contrato .maestro/tmp/13.3e-contract.md) — extração do NÚCLEO
// presentational do Editor de Item (`app/modulo/page.tsx`, Task 13.1: accordion
// Caixa→Divisões→Portas→Gavetas→Puxador + seções de Placa + painel de
// custo/peças/plano de corte). Mesmo padrão exato de
// `components/ambientes/AmbientesLab.tsx` (`estadoInicial`/`onSalvar`, Task
// 13.3d/13.2b): este componente recebe UM `ModuloOrcamento` via prop e nunca
// sabe de onde ele veio nem para onde `onSalvar` grava — pode ser
// `boxPresets.ts`/localStorage (`/modulo`, ver `page.tsx`) ou uma Server
// Action Supabase (`/orcamento/[id]/item/[itemId]`, ver
// `lib/orcamento/salvarItem.ts`) ou nada (harness `/dev/preview/orcamento/item`).
//
// Diferença para `AmbientesLab`: aqui a "origem" (`custom_box` × `placa`) do
// item é FIXA para a vida deste componente — lida uma única vez de
// `estadoInicial.origem` no `useState` preguiçoso do hook de estado
// (`EditorItemNucleoEstado.ts`), igual ao resto do estado. Quem precisa
// trocar de origem no meio da sessão (`/modulo`, com o seletor "Módulo-caixa
// / Placa") monta DOIS `EditorItemNucleo` (um por origem) e alterna a
// VISIBILIDADE via CSS — nunca troca a prop `estadoInicial` de uma instância
// já montada — exatamente o padrão `forceMount` +
// `data-[state=inactive]:hidden` que `components/orcamento/OrcamentoAbas.tsx`
// já usa para a aba "Ambientes" (preserva o progresso de edição dos dois
// lados ao trocar de aba).
//
// Task R.3c — decomposição pura (1.003 linhas → teto `maxUiFileLines: 400`):
// estado bruto em `EditorItemNucleoEstado.ts`, handlers em
// `EditorItemNucleoAcoes.ts`, JSX em `EditorItemNucleo*Accordion/Panel*.tsx`.
// Este arquivo só monta as peças — zero mudança de comportamento/aparência.

export type { ResultadoSalvarItem };
export { caixaInicial, placaInicial } from "./EditorItemNucleoHelpers";

export interface EditorItemNucleoProps {
  /** Item sendo editado agora. Só é lido na PRIMEIRA renderização
   * (inicializador preguiçoso do `useState`, mesmo padrão de
   * `AmbientesLab.estadoInicial`) — trocar a prop depois de montado NÃO
   * reseta o progresso em edição. Para editar um item diferente, monte uma
   * instância nova (`key` diferente). */
  estadoInicial: ModuloOrcamento;
  /** Chamado só quando o usuário clica no botão de salvar — NUNCA autosave.
   * Quem implementa decide o destino (presets em localStorage, Server Action
   * no Supabase, no-op de harness) e como reporta sucesso/erro. */
  onSalvar: (modulo: ModuloOrcamento) => Promise<ResultadoSalvarItem>;
  /** Rótulo do botão principal de salvar (default: "Salvar"). */
  rotuloBotaoSalvar?: string;
  /** Esconde a ação de salvar por completo — usado por `/modulo` do lado
   * Placa, que não tem biblioteca de presets (só módulo-caixa tem, ver
   * `lib/boxPresets.ts`): mantém o comportamento idêntico ao que existia
   * antes desta extração (nenhum botão de salvar do lado Placa). Default
   * `true` (usado por `/orcamento/[id]/item/[itemId]`, onde qualquer origem
   * pode ser salva de verdade). */
  exibirAcaoSalvar?: boolean;
}

export function EditorItemNucleo({
  estadoInicial,
  onSalvar,
  rotuloBotaoSalvar = "Salvar",
  exibirAcaoSalvar = true,
}: EditorItemNucleoProps) {
  const estado = useEditorItemNucleoEstado(estadoInicial);
  const acoes = useEditorItemNucleoAcoes(estado, onSalvar);

  return (
    // Screen-Composition.md "Editor de Item" — grade 1fr/1fr, gap-xl, colapsa
    // em `lg` (não `md`, coluna direita precisa de espaço mínimo pro canvas
    // 2D não distorcer). Substitui `.legado-grid` (CSS legado, 1.3fr/1fr,
    // gutter 20px fora da escala) — Design-System §16.4.
    <div className="grid grid-cols-1 gap-xl lg:grid-cols-2">
      {/* Esquerda: configuração da caixa + divisões + conteúdo, OU as
          seções de Placa — nunca as duas ao mesmo tempo (origem é fixa). */}
      <div className="flex flex-col gap-lg">
        {estado.origem === "custom_box" ? (
          <EditorItemNucleoBoxAccordion
            box={estado.box}
            cores={estado.cores}
            categorias={estado.categorias}
            catalogo={estado.catalogo}
            secaoAberta={estado.secaoAbertaBox}
            stepperIndex={estado.stepperIndexBox}
            modoSelecao={estado.modoSelecao}
            vaosSelecionados={estado.vaosSelecionados}
            divisaoSelecionada={estado.divisaoSelecionada}
            grupoPortaEmEdicao={estado.grupoPortaEmEdicao}
            gavetaEmEdicao={estado.gavetaEmEdicao}
            onAbrir={estado.setSecaoAbertaBox}
            onAvancar={acoes.avancarSecao}
            onChangeBox={acoes.setBoxCampo}
            onSelecionarModoDivisoes={acoes.clicarSelecionarDivisoes}
            onAplicarDivisoes={acoes.aplicarDivisoes}
            onExcluirDivisao={acoes.excluirDivisao}
            onSelecionarModoPortas={acoes.clicarSelecionarPortas}
            onAplicarPortasVaosSelecionados={acoes.aplicarPortasVaosSelecionados}
            onSalvarEdicaoPorta={acoes.salvarEdicaoPorta}
            onExcluirGrupoPorta={acoes.excluirGrupoPorta}
            onCancelarEdicaoPorta={() => estado.setPortaSelecionada(null)}
            onExcluirPortas={acoes.excluirPortas}
            onSelecionarModoGavetas={acoes.clicarSelecionarGavetas}
            onAplicarGavetas={acoes.aplicarGavetas}
            onSalvarEdicaoGaveta={acoes.salvarEdicaoGaveta}
            onExcluirEdicaoGaveta={acoes.excluirEdicaoGaveta}
            onCancelarEdicaoGaveta={() => estado.setVaoGavetaSelecionado(null)}
            onExcluirGavetas={acoes.excluirGavetas}
          />
        ) : (
          <EditorItemNucleoPlacaAccordion
            placa={estado.placa}
            cores={estado.cores}
            catalogo={estado.catalogo}
            ordemPlaca={estado.ordemPlaca}
            secaoAberta={estado.secaoAbertaPlaca}
            stepperIndex={estado.stepperIndexPlaca}
            onAbrir={estado.setSecaoAbertaPlaca}
            onAvancar={acoes.avancarSecaoPlaca}
            onChangePlaca={acoes.setPlacaCampo}
          />
        )}
      </div>

      {/* Direita: canvas de seleção (box) ou referência visual (placa) +
          custo + peças + plano de corte (leitura técnica, não decisão —
          Screen-Composition.md "Editor de Item", Poda: sai da coluna de
          decisão e vai para a de revisão). Tokens de KPI/tabela —
          Design-System Seção 6.8/6.9. */}
      <div className="flex flex-col gap-lg">
        {estado.origem === "custom_box" ? (
          <EditorItemNucleoBoxCanvasPanel
            box={estado.box}
            modoVisualizacao={estado.modoVisualizacao}
            onChangeModoVisualizacao={estado.setModoVisualizacao}
            modoSelecao={estado.modoSelecao}
            multiSelecaoVaos={estado.multiSelecaoVaos}
            onClicarSelecionarVaos={acoes.clicarSelecionarVaos}
            vaosSelecionados={estado.vaosSelecionados}
            onToggleVao={acoes.toggleVao}
            divisaoSelecionada={estado.divisaoSelecionada}
            onSelecionarDivisoria={estado.setDivisaoSelecionada}
            portaSelecionada={estado.portaSelecionada}
            onSelecionarPorta={estado.setPortaSelecionada}
            vaoGavetaSelecionado={estado.vaoGavetaSelecionado}
            onSelecionarVaoGaveta={estado.setVaoGavetaSelecionado}
            anguloModuleViewer={estado.anguloModuleViewer}
            onChangeAnguloModuleViewer={estado.setAnguloModuleViewer}
            corModuleViewer={estado.corModuleViewer}
            texturaUrlModuleViewer={estado.texturaUrlModuleViewer}
            exibirAcaoSalvar={exibirAcaoSalvar}
            rotuloBotaoSalvar={rotuloBotaoSalvar}
            salvando={estado.salvando}
            onSalvar={acoes.handleSalvar}
            onLimpar={acoes.limpar}
            onResetar={acoes.resetar}
            resultadoSalvar={estado.resultadoSalvar}
          />
        ) : (
          <EditorItemNucleoPlacaPanel
            placa={estado.placa}
            onToggleLadoEngrossamento={acoes.toggleLadoEngrossamento}
            onInverterVeio={acoes.inverterSentidoVeio}
            exibirAcaoSalvar={exibirAcaoSalvar}
            rotuloBotaoSalvar={rotuloBotaoSalvar}
            salvando={estado.salvando}
            onSalvar={acoes.handleSalvar}
            onResetar={acoes.resetarPlaca}
            resultadoSalvar={estado.resultadoSalvar}
          />
        )}

        <EditorItemNucleoCustoPanel
          precoComDesconto={estado.resultado.financeiro.precoComDesconto}
          custoDireto={estado.resultado.financeiro.custoDireto}
          insumos={estado.resultado.insumos}
        />

        <EditorItemNucleoPecasPanel pecas={estado.pecas} />

        <EditorItemNucleoPlanoCorte grupos={estado.grupos} calculando={estado.calculandoPlanoDeCorte} />
      </div>
    </div>
  );
}
