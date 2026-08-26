// Task R.3c — decomposição pura de `EditorItemNucleo.tsx`: accordion
// Caixa→Divisões→Portas→Gavetas→Puxador (Task 13.1), extraído sem nenhuma
// mudança de comportamento ou de aparência.

import { Stepper } from "@/components/ui/stepper";
import type { BoxModule, GrupoPortas } from "@/lib/engine/box";
import type { Catalogo } from "@/lib/catalog";
import type { ModoSelecao } from "../components/BoxCanvas";
import { CaixaCard } from "./CaixaCard";
import { DivisoesCard, type ConfigDivisao } from "./DivisoesCard";
import { PortasCard, type ConfigPortas } from "./PortasCard";
import { GavetasCard, type ConfigGaveta, type GavetaEmEdicao } from "./GavetasCard";
import { PuxadorCard } from "./PuxadorCard";
import { ORDEM_SECOES, ROTULOS_SECOES, type DivisaoSel, type Secao } from "./EditorItemNucleoTipos";

export interface EditorItemNucleoBoxAccordionProps {
  box: BoxModule;
  cores: string[];
  categorias: string[];
  catalogo: Catalogo | null;
  secaoAberta: Secao | null;
  stepperIndex: number;
  modoSelecao: ModoSelecao;
  vaosSelecionados: string[];
  divisaoSelecionada: DivisaoSel | null;
  grupoPortaEmEdicao: GrupoPortas | null;
  gavetaEmEdicao: GavetaEmEdicao | null;
  onAbrir: (secao: Secao) => void;
  onAvancar: (secao: Secao) => void;
  onChangeBox: (patch: Partial<BoxModule>) => void;
  onSelecionarModoDivisoes: () => void;
  onAplicarDivisoes: (cfg: ConfigDivisao) => void;
  onExcluirDivisao: () => void;
  onSelecionarModoPortas: () => void;
  onAplicarPortasVaosSelecionados: (cfg: ConfigPortas) => void;
  onSalvarEdicaoPorta: (id: string, cfg: ConfigPortas) => void;
  onExcluirGrupoPorta: (id: string) => void;
  onCancelarEdicaoPorta: () => void;
  onExcluirPortas: () => void;
  onSelecionarModoGavetas: () => void;
  onAplicarGavetas: (cfg: ConfigGaveta) => void;
  onSalvarEdicaoGaveta: (vaoId: string, cfg: ConfigGaveta) => void;
  onExcluirEdicaoGaveta: (vaoId: string) => void;
  onCancelarEdicaoGaveta: () => void;
  onExcluirGavetas: () => void;
}

export function EditorItemNucleoBoxAccordion({
  box,
  cores,
  categorias,
  catalogo,
  secaoAberta,
  stepperIndex,
  modoSelecao,
  vaosSelecionados,
  divisaoSelecionada,
  grupoPortaEmEdicao,
  gavetaEmEdicao,
  onAbrir,
  onAvancar,
  onChangeBox,
  onSelecionarModoDivisoes,
  onAplicarDivisoes,
  onExcluirDivisao,
  onSelecionarModoPortas,
  onAplicarPortasVaosSelecionados,
  onSalvarEdicaoPorta,
  onExcluirGrupoPorta,
  onCancelarEdicaoPorta,
  onExcluirPortas,
  onSelecionarModoGavetas,
  onAplicarGavetas,
  onSalvarEdicaoGaveta,
  onExcluirEdicaoGaveta,
  onCancelarEdicaoGaveta,
  onExcluirGavetas,
}: EditorItemNucleoBoxAccordionProps) {
  return (
    <>
      {/* Task 7.1 — Stepper (Seção 6.5) acima da pilha do accordion,
          refletindo secaoAbertaBox/ORDEM_SECOES (só leitura, sem novo estado). */}
      <Stepper
        steps={ORDEM_SECOES.map((s) => ROTULOS_SECOES[s])}
        currentStep={stepperIndex}
        className="mb-4"
      />

      {/* Os 5 cards do accordion usam gap-sm (8px) entre si — reforça que
          são etapas de um fluxo, distinto do gap-lg de cards independentes
          (ver "Plano de corte", fora do accordion). */}
      <div className="mb-4 flex flex-col gap-2">
        <CaixaCard
          box={box}
          cores={cores}
          categorias={categorias}
          onChange={onChangeBox}
          aberta={secaoAberta === "caixa"}
          onAbrir={() => onAbrir("caixa")}
          onSalvar={() => onAvancar("caixa")}
        />

        <DivisoesCard
          vaosSelecionados={vaosSelecionados}
          divisaoSelecionada={divisaoSelecionada}
          modoSelecaoDivisoes={modoSelecao === "divisoes"}
          onSelecionarModoDivisoes={onSelecionarModoDivisoes}
          onAplicar={onAplicarDivisoes}
          onExcluir={onExcluirDivisao}
          aberta={secaoAberta === "divisoes"}
          onAbrir={() => onAbrir("divisoes")}
          onSalvar={() => onAvancar("divisoes")}
        />

        <PortasCard
          vaosSelecionados={vaosSelecionados}
          cores={cores}
          catalogo={catalogo}
          modoSelecaoPortas={modoSelecao === "portas"}
          onSelecionarModoPortas={onSelecionarModoPortas}
          grupoEmEdicao={grupoPortaEmEdicao}
          onAplicarVaosSelecionados={onAplicarPortasVaosSelecionados}
          onSalvarEdicao={onSalvarEdicaoPorta}
          onExcluirGrupo={onExcluirGrupoPorta}
          onCancelarEdicao={onCancelarEdicaoPorta}
          onExcluirPorVaos={onExcluirPortas}
          aberta={secaoAberta === "portas"}
          onAbrir={() => onAbrir("portas")}
          onSalvar={() => onAvancar("portas")}
        />

        <GavetasCard
          vaosSelecionados={vaosSelecionados}
          cores={cores}
          catalogo={catalogo}
          modoSelecaoGavetas={modoSelecao === "gavetas"}
          onSelecionarModoGavetas={onSelecionarModoGavetas}
          gavetaEmEdicao={gavetaEmEdicao}
          onAplicar={onAplicarGavetas}
          onSalvarEdicao={onSalvarEdicaoGaveta}
          onExcluirEdicao={onExcluirEdicaoGaveta}
          onCancelarEdicao={onCancelarEdicaoGaveta}
          onExcluir={onExcluirGavetas}
          aberta={secaoAberta === "gavetas"}
          onAbrir={() => onAbrir("gavetas")}
          onSalvar={() => onAvancar("gavetas")}
        />

        <PuxadorCard
          tipo={box.puxador}
          onChange={(tipo) => onChangeBox({ puxador: tipo })}
          aberta={secaoAberta === "puxador"}
          onAbrir={() => onAbrir("puxador")}
          onSalvar={() => onAvancar("puxador")}
        />
      </div>
    </>
  );
}
