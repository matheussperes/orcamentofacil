// Task R.3c — decomposição pura de `EditorItemNucleo.tsx`: accordion das
// seções de Placa (Task 13.1), extraído sem nenhuma mudança de
// comportamento ou de aparência.

import { Stepper } from "@/components/ui/stepper";
import type { Placa } from "@/lib/engine/placa/types";
import type { Catalogo } from "@/lib/catalog";
import { PlacaDimensoesCard } from "./PlacaDimensoesCard";
import { PlacaOrientacaoCard } from "./PlacaOrientacaoCard";
import { PlacaBordaCard } from "./PlacaBordaCard";
import { PlacaEngrossamentoCard } from "./PlacaEngrossamentoCard";
import { PlacaRipadoCard } from "./PlacaRipadoCard";
import { ordemSecoesPlaca, ROTULOS_SECOES_PLACA, type SecaoPlaca } from "./secoes";

export interface EditorItemNucleoPlacaAccordionProps {
  placa: Placa;
  cores: string[];
  catalogo: Catalogo | null;
  ordemPlaca: ReturnType<typeof ordemSecoesPlaca>;
  secaoAberta: SecaoPlaca | null;
  stepperIndex: number;
  onAbrir: (secao: SecaoPlaca) => void;
  onAvancar: (secao: SecaoPlaca) => void;
  onChangePlaca: (patch: Partial<Placa>) => void;
}

export function EditorItemNucleoPlacaAccordion({
  placa,
  cores,
  catalogo,
  ordemPlaca,
  secaoAberta,
  stepperIndex,
  onAbrir,
  onAvancar,
  onChangePlaca,
}: EditorItemNucleoPlacaAccordionProps) {
  return (
    <>
      {/* Task 13.1 — mesmo padrão de Stepper do box, agora sobre
          `ordemPlaca` (derivada de CAPACIDADES.placa). */}
      <Stepper
        steps={ordemPlaca.map((s) => ROTULOS_SECOES_PLACA[s])}
        currentStep={stepperIndex}
        className="mb-4"
      />

      <div className="mb-4 flex flex-col gap-2">
        {ordemPlaca.includes("dimensoesMaterial") && (
          <PlacaDimensoesCard
            placa={placa}
            cores={cores}
            catalogo={catalogo}
            onChange={onChangePlaca}
            aberta={secaoAberta === "dimensoesMaterial"}
            onAbrir={() => onAbrir("dimensoesMaterial")}
            onSalvar={() => onAvancar("dimensoesMaterial")}
          />
        )}
        {ordemPlaca.includes("orientacao") && (
          <PlacaOrientacaoCard
            orientacao={placa.orientacao}
            onChange={(orientacao) => onChangePlaca({ orientacao })}
            aberta={secaoAberta === "orientacao"}
            onAbrir={() => onAbrir("orientacao")}
            onSalvar={() => onAvancar("orientacao")}
          />
        )}
        {ordemPlaca.includes("bordaPorLado") && (
          <PlacaBordaCard
            bordaPorLado={placa.bordaPorLado}
            onChange={(bordaPorLado: Placa["bordaPorLado"]) => onChangePlaca({ bordaPorLado })}
            aberta={secaoAberta === "bordaPorLado"}
            onAbrir={() => onAbrir("bordaPorLado")}
            onSalvar={() => onAvancar("bordaPorLado")}
          />
        )}
        {ordemPlaca.includes("engrossamento") && (
          <PlacaEngrossamentoCard
            engrossamento={placa.engrossamento}
            espessuraBase={placa.material.espessura}
            onChange={(engrossamento) => onChangePlaca({ engrossamento })}
            aberta={secaoAberta === "engrossamento"}
            onAbrir={() => onAbrir("engrossamento")}
            onSalvar={() => onAvancar("engrossamento")}
          />
        )}
        {ordemPlaca.includes("ripado") && (
          <PlacaRipadoCard
            ripado={placa.ripado}
            onChange={(ripado) => onChangePlaca({ ripado })}
            aberta={secaoAberta === "ripado"}
            onAbrir={() => onAbrir("ripado")}
            onSalvar={() => onAvancar("ripado")}
          />
        )}
      </div>
    </>
  );
}
