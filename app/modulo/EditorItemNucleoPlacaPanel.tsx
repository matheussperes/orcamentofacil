// Task R.3c — decomposição pura de `EditorItemNucleo.tsx`: painel de
// referência visual do lado `placa` + ações Salvar/Resetar + alerta de
// resultado, extraído sem nenhuma mudança de comportamento ou de aparência.

import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlacaVisual } from "../components/PlacaVisual";
import type { LadoPlaca, Placa } from "@/lib/engine/placa/types";
import type { ResultadoSalvarItem } from "./EditorItemNucleoTipos";

export interface EditorItemNucleoPlacaPanelProps {
  placa: Placa;
  onToggleLadoEngrossamento: (lado: LadoPlaca) => void;
  onInverterVeio: () => void;
  exibirAcaoSalvar: boolean;
  rotuloBotaoSalvar: string;
  salvando: boolean;
  onSalvar: () => void;
  onResetar: () => void;
  resultadoSalvar: ResultadoSalvarItem | null;
}

export function EditorItemNucleoPlacaPanel({
  placa,
  onToggleLadoEngrossamento,
  onInverterVeio,
  exibirAcaoSalvar,
  rotuloBotaoSalvar,
  salvando,
  onSalvar,
  onResetar,
  resultadoSalvar,
}: EditorItemNucleoPlacaPanelProps) {
  return (
    <div className="card">
      <h2>Placa (referência visual)</h2>
      <PlacaVisual
        largura={placa.largura}
        altura={placa.altura}
        lados={placa.engrossamento?.tecnica === "engrossada" ? placa.engrossamento.lados : []}
        ladosInterativos={placa.engrossamento?.tecnica === "engrossada"}
        onToggleLado={onToggleLadoEngrossamento}
        temVeio={placa.material.temVeio ?? false}
        sentidoVeio={placa.sentidoVeio ?? "comprimento"}
        onInverterVeio={onInverterVeio}
      />
      <div className="acoes" style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {exibirAcaoSalvar && (
          <button className="primary" onClick={onSalvar} disabled={salvando}>
            {salvando ? "Salvando…" : rotuloBotaoSalvar}
          </button>
        )}
        <button className="danger" onClick={onResetar}>Resetar</button>
      </div>
      {resultadoSalvar && (
        <Alert variant={resultadoSalvar.ok ? "sucesso" : "erro"} className="mt-3">
          <AlertDescription>
            {resultadoSalvar.ok
              ? (resultadoSalvar.mensagem ?? "Salvo com sucesso.")
              : (resultadoSalvar.erro ?? "Não foi possível salvar.")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
