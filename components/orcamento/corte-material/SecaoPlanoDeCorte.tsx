"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { TituloSecao } from "@/components/ui/titulo-secao";
import { PlanoCorteCanvas } from "@/app/components/PlanoCorteCanvas";
import type { GrupoChapas } from "@/lib/engine/box/cutting";

// Design-System.md Seção 9.4 — limiares de aproveitamento (decisão do
// Product Designer, não estavam explícitos no mockup): >=70% sucesso,
// 40–70% accent, <40% erro.
function corAproveitamento(aproveitamento: number): "sucesso" | "accent" | "erro" {
  if (aproveitamento >= 0.7) return "sucesso";
  if (aproveitamento >= 0.4) return "accent";
  return "erro";
}

/** Task R.5a — extraído de `CorteMaterialLab.tsx` (decomposição pura, teto
 * de 400 linhas/arquivo) — seção "Plano de corte" (chapas + toggle veios). */
export function SecaoPlanoDeCorte({
  grupos,
  calculando,
  mostrarVeios,
  setMostrarVeios,
}: {
  grupos: GrupoChapas[];
  calculando: boolean;
  mostrarVeios: boolean;
  setMostrarVeios: (v: boolean) => void;
}) {
  return (
    <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      <TituloSecao
        action={
          <div className="flex items-center gap-xs">
            <Label htmlFor="toggle-mostrar-veios" className="text-corpo-pequeno text-cinza-700">
              Mostrar veios
            </Label>
            <Switch id="toggle-mostrar-veios" checked={mostrarVeios} onCheckedChange={setMostrarVeios} />
          </div>
        }
      >
        <span className="flex flex-wrap items-center gap-sm">
          Plano de corte
          {calculando && (
            <span className="flex items-center gap-xs text-legenda text-cinza-500">
              <span className="h-1.5 w-1.5 rounded-full bg-cinza-300 animate-pulse" aria-hidden="true" />
              Otimizando plano de corte…
            </span>
          )}
        </span>
      </TituloSecao>
      <p className="mb-md text-corpo-pequeno text-cinza-500">
        Chapas de {grupos[0]?.larguraChapa ?? 2750}×{grupos[0]?.alturaChapa ?? 1840}mm, escala 1:10.
        Empacotamento heurístico (prateleiras) — validação visual, não substitui um otimizador de
        corte industrial. Restrição de sentido do veio já aplicada por peça.
      </p>
      <div className="flex flex-col gap-lg">
        {grupos.map((grupo) => {
          const areaConsumidaM2 = grupo.chapas.reduce(
            (soma, chapa) => soma + chapa.pecas.reduce((s, p) => s + (p.w * p.h) / 1_000_000, 0),
            0
          );
          return (
            <div key={`${grupo.cor}-${grupo.espessura_mm}`}>
              <h3 className="mb-sm text-titulo-card text-cinza-900">
                MDF {grupo.cor} {grupo.espessura_mm}mm
              </h3>
              <div className="flex flex-col gap-md">
                {grupo.chapas.map((chapa, i) => (
                  <div key={chapa.index} className="grid grid-cols-[auto_1fr] gap-lg">
                    <PlanoCorteCanvas
                      chapa={chapa}
                      larguraChapa={grupo.larguraChapa}
                      alturaChapa={grupo.alturaChapa}
                      mostrarVeios={mostrarVeios}
                    />
                    <div className="flex flex-col gap-sm self-start">
                      {i === 0 && (
                        <span className="text-corpo-pequeno text-cinza-500 tabular-nums">
                          {grupo.chapas.length} chapa(s) · {areaConsumidaM2.toFixed(2)} m² consumidos
                        </span>
                      )}
                      <Progress
                        value={chapa.aproveitamento * 100}
                        corPreenchimento={corAproveitamento(chapa.aproveitamento)}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {grupo.pecasForaDaChapa.length > 0 && (
                <Alert variant="aviso" className="mt-sm">
                  <AlertDescription>
                    {grupo.pecasForaDaChapa.length} peça(s) maior(es) que a chapa em qualquer
                    orientação: {grupo.pecasForaDaChapa.map((p) => p.nome).join(", ")}.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
