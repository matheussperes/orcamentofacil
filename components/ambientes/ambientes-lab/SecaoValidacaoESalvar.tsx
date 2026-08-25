"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { EngineWarning } from "@/lib/engine/types";
import type { ResultadoSalvarAmbiente } from "@/lib/ambiente/estado";

/** Task R.3a — extraído de AmbientesLab.tsx (decomposição pura). Painel de
 * validação (Tier 1 + Tier 2, Task 13.2b/13.2c) e rodapé de "Salvar
 * alterações" (Task 13.3d — ação explícita, nunca autosave). */
export function SecaoValidacaoESalvar({
  warnings,
  salvando,
  resultadoSalvar,
  handleSalvar,
}: {
  warnings: EngineWarning[];
  salvando: boolean;
  resultadoSalvar: ResultadoSalvarAmbiente | null;
  handleSalvar: () => void;
}) {
  return (
    <>
      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <h2 className="mb-3 text-titulo-secao text-cinza-900">Validação</h2>
        {warnings.length === 0 ? (
          <Alert variant="sucesso">
            <AlertDescription>Nenhum problema encontrado.</AlertDescription>
          </Alert>
        ) : (
          <div className="flex flex-col gap-sm">
            {warnings.map((w, i) => (
              <Alert key={i} variant={w.severidade === "erro" ? "erro" : "aviso"}>
                <AlertDescription>{w.mensagem}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </section>

      {/* Task 13.3d — rodapé da aba: ação explícita de salvar (contrato:
          "NÃO autosave"). Qualquer mudança de estado acima limpa o feedback
          anterior (`marcarAlteracao`) pra não mostrar um "salvo com
          sucesso" desatualizado depois de editar algo. */}
      <section className="flex flex-col items-start gap-sm rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs">
        <Button variant="primary" onClick={handleSalvar} disabled={salvando}>
          {salvando ? "Salvando alterações…" : "Salvar alterações"}
        </Button>
        {resultadoSalvar && (
          <Alert variant={resultadoSalvar.ok ? "sucesso" : "erro"} className="w-full">
            <AlertDescription>
              {resultadoSalvar.ok
                ? "Alterações salvas com sucesso."
                : (resultadoSalvar.erro ?? "Não foi possível salvar as alterações.")}
            </AlertDescription>
          </Alert>
        )}
      </section>
    </>
  );
}
