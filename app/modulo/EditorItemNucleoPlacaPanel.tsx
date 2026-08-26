// Task R.3c — decomposição pura de `EditorItemNucleo.tsx`: painel de
// referência visual do lado `placa` + ações Salvar/Resetar + alerta de
// resultado, extraído sem nenhuma mudança de comportamento ou de aparência.

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
    <Card>
      <CardHeader>
        <CardTitle>Placa (referência visual)</CardTitle>
      </CardHeader>
      <CardContent>
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
        <div className="mt-md flex flex-wrap items-center gap-xs">
          {exibirAcaoSalvar && (
            <Button onClick={onSalvar} disabled={salvando}>
              {salvando ? "Salvando…" : rotuloBotaoSalvar}
            </Button>
          )}
          <Button variant="danger" onClick={onResetar}>Resetar</Button>
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
      </CardContent>
    </Card>
  );
}
