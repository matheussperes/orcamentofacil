// Task R.3c — decomposição pura de `EditorItemNucleo.tsx`: card "Plano de
// corte", extraído sem nenhuma mudança de comportamento ou de aparência.

import type { usePlanoDeCorte } from "@/lib/engine/box/usarPlanoDeCorte";
import { PlanoCorteCanvas } from "../components/PlanoCorteCanvas";

export interface EditorItemNucleoPlanoCorteProps {
  grupos: ReturnType<typeof usePlanoDeCorte>["grupos"];
  calculando: boolean;
}

export function EditorItemNucleoPlanoCorte({ grupos, calculando }: EditorItemNucleoPlanoCorteProps) {
  return (
    <div className="card">
      <div className="flex flex-wrap items-center gap-sm">
        <h2>Plano de corte</h2>
        {calculando && (
          <span className="flex items-center gap-xs text-legenda text-cinza-500">
            <span className="h-1.5 w-1.5 rounded-full bg-cinza-300 animate-pulse" aria-hidden="true" />
            Otimizando plano de corte…
          </span>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
        Chapas de {grupos[0]?.larguraChapa ?? 2750}×{grupos[0]?.alturaChapa ?? 1840}mm,
        escala 1:10. Empacotamento heurístico (prateleiras) — apenas para validação
        visual, não substitui um otimizador de corte industrial.
      </p>
      {grupos.length === 0 && <p className="muted">Nenhuma peça gerada ainda.</p>}
      {grupos.map((g) => (
        <div key={`${g.cor}-${g.espessura_mm}`} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            MDF {g.cor} {g.espessura_mm}mm — {g.chapas.length} chapa(s)
          </div>
          <div>
            {g.chapas.map((c) => (
              <PlanoCorteCanvas
                key={c.index}
                chapa={c}
                larguraChapa={g.larguraChapa}
                alturaChapa={g.alturaChapa}
                mostrarVeios={false}
              />
            ))}
          </div>
          {g.pecasForaDaChapa.length > 0 && (
            <div className="aviso erro">
              {g.pecasForaDaChapa.length} peça(s) maior(es) que a chapa em
              qualquer orientação: {g.pecasForaDaChapa.map((p) => p.nome).join(", ")}.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
