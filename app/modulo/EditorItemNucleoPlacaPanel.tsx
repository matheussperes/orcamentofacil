// Task R.3c — decomposição pura de `EditorItemNucleo.tsx`: painel de
// referência visual do lado `placa` + ações Salvar/Resetar + alerta de
// resultado, extraído sem nenhuma mudança de comportamento ou de aparência.

import { PlacaVisual } from "../components/PlacaVisual";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { LadoPlaca, Placa } from "@/lib/engine/placa/types";

export interface EditorItemNucleoPlacaPanelProps {
  placa: Placa;
  onToggleLadoEngrossamento: (lado: LadoPlaca) => void;
  onInverterVeio: () => void;
}

export function EditorItemNucleoPlacaPanel({
  placa,
  onToggleLadoEngrossamento,
  onInverterVeio,
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
      </CardContent>
    </Card>
  );
}
