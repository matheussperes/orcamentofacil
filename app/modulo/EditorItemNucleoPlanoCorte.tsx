// Task R.3c — decomposição pura de `EditorItemNucleo.tsx`: card "Plano de
// corte", extraído sem nenhuma mudança de comportamento ou de aparência.

import { Scissors } from "lucide-react";
import type { usePlanoDeCorte } from "@/lib/engine/box/usarPlanoDeCorte";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EstadoVazioAba } from "@/components/ui/estado-vazio-aba";
import { PlanoCorteCanvas } from "../components/PlanoCorteCanvas";

export interface EditorItemNucleoPlanoCorteProps {
  grupos: ReturnType<typeof usePlanoDeCorte>["grupos"];
  calculando: boolean;
}

export function EditorItemNucleoPlanoCorte({ grupos, calculando }: EditorItemNucleoPlanoCorteProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-sm">
          <CardTitle>Plano de corte</CardTitle>
          {calculando && (
            <span className="flex items-center gap-xs text-legenda text-cinza-500">
              <span className="h-1.5 w-1.5 rounded-full bg-cinza-300 animate-pulse" aria-hidden="true" />
              Otimizando plano de corte…
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="-mt-xs text-corpo-pequeno text-cinza-500">
          Chapas de {grupos[0]?.larguraChapa ?? 2750}×{grupos[0]?.alturaChapa ?? 1840}mm,
          escala 1:10. Empacotamento heurístico (prateleiras) — apenas para validação
          visual, não substitui um otimizador de corte industrial.
        </p>
        {grupos.length === 0 && (
          <EstadoVazioAba
            icone={Scissors}
            titulo="Nenhuma peça gerada ainda"
            descricao="O plano de corte aparece aqui assim que a configuração do item gerar peças."
            className="border-none p-0 py-lg shadow-none"
          />
        )}
        {grupos.map((g) => (
          <div key={`${g.cor}-${g.espessura_mm}`} className="mb-lg">
            <div className="mb-xs font-semibold text-corpo text-cinza-900">
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
              <div className="rounded-sm border border-erro bg-erro-subtle px-md py-sm text-corpo-pequeno text-erro">
                {g.pecasForaDaChapa.length} peça(s) maior(es) que a chapa em
                qualquer orientação: {g.pecasForaDaChapa.map((p) => p.nome).join(", ")}.
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
