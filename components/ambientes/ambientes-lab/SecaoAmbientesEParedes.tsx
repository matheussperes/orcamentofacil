"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { TituloSecao } from "@/components/ui/titulo-secao";
import { SeletorLista } from "../SeletorLista";
import type { useSelecaoAmbiente } from "./useSelecaoAmbiente";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Seletor de
 * ambiente/parede: indicação visual PERMANENTE (aba ativa, não hover —
 * Design-System §7.8) de qual ambiente e qual parede estão em edição. */
export function SecaoAmbientesEParedes({ selecao }: { selecao: ReturnType<typeof useSelecaoAmbiente> }) {
  return (
    <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
      <TituloSecao>Ambientes e paredes</TituloSecao>
      {selecao.erroComando && (
        <Alert variant="erro" className="mb-3">
          <AlertDescription>{selecao.erroComando}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-lg">
        <SeletorLista
          rotulo="ambiente"
          rotuloPlural="Ambientes"
          itens={selecao.ambientes.map((a) => ({ id: a.id, nome: a.nome }))}
          selecionadoId={selecao.ambienteSelecionadoId}
          onSelecionar={selecao.selecionarAmbiente}
          onCriar={(nome) => selecao.executarComandoAmbiente({ tipo: "criarAmbiente", nome })}
          onRenomear={(id, nome) =>
            selecao.executarComandoAmbiente({ tipo: "renomearAmbiente", ambienteId: id, nome })
          }
          onExcluir={(id) => selecao.executarComandoAmbiente({ tipo: "excluirAmbiente", ambienteId: id })}
          onMover={selecao.moverAmbiente}
          desabilitado={selecao.comandoEmVoo}
        />
        <SeletorLista
          rotulo="parede"
          rotuloPlural="Paredes"
          itens={selecao.ambienteSelecionado.paredes.map((p) => ({ id: p.id, nome: p.nome }))}
          selecionadoId={selecao.paredeSelecionadaId}
          onSelecionar={selecao.selecionarParede}
          onCriar={(nome) =>
            selecao.executarComandoAmbiente({ tipo: "criarParede", ambienteId: selecao.ambienteSelecionadoId, nome })
          }
          onRenomear={(id, nome) =>
            selecao.executarComandoAmbiente({ tipo: "renomearParede", paredeId: id, nome })
          }
          onExcluir={(id) => selecao.executarComandoAmbiente({ tipo: "excluirParede", paredeId: id })}
          onMover={selecao.moverParede}
          desabilitado={selecao.comandoEmVoo}
        />
      </div>
    </section>
  );
}
