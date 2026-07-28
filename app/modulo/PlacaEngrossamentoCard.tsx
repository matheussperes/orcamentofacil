"use client";

import type { Engrossamento, NivelEngrossamento } from "@/lib/engine/placa/types";
import { SecaoHeader } from "./SecaoHeader";

const SARRAFO_LARGURA_PADRAO = 70; // mm — mesmo default de lib/engine/placa/explode.ts

const RÓTULO_LADO: Record<string, string> = {
  superior: "Superior",
  inferior: "Inferior",
  esquerda: "Esquerda",
  direita: "Direita",
};

// Task 13.1 — seção "engrossamento" (capacidade "engrossamento", Modelo de
// Domínio Seção 2.1). A seleção dos LADOS acontece na referência visual do
// painel direito (`PlacaVisual`, requisito de UX 2.1.1 — mesmo padrão de
// "selecionar no canvas, configurar no card" já usado por Divisões/Portas/
// Gavetas do módulo-caixa); aqui só mostra o resumo (badges) e os campos de
// técnica/nível/sarrafo. Nível 3 é filtrado quando a espessura BASE é 18mm
// (Modelo de Domínio, decisão do operador 2026-07-27 — 72mm excede a maior
// fita do catálogo); o motor (`validarNivelEspessuraBase`) já é a rede de
// segurança final, isto é só a UI não oferecendo a combinação inválida.
export function PlacaEngrossamentoCard({
  engrossamento,
  espessuraBase,
  onChange,
  aberta,
  onAbrir,
  onSalvar,
}: {
  engrossamento: Engrossamento | undefined;
  espessuraBase: number;
  onChange: (engrossamento: Engrossamento | undefined) => void;
  aberta: boolean;
  onAbrir: () => void;
  onSalvar: () => void;
}) {
  const niveisDisponiveis: NivelEngrossamento[] = espessuraBase === 18 ? [1, 2] : [1, 2, 3];
  const tecnica = engrossamento?.tecnica ?? "nenhum";

  function mudarTecnica(t: "nenhum" | "engrossada" | "dobrada") {
    if (t === "nenhum") {
      onChange(undefined);
    } else if (t === "engrossada") {
      onChange({
        tecnica: "engrossada",
        nivel: 1,
        lados: engrossamento?.tecnica === "engrossada" ? engrossamento.lados : [],
        larguraSarrafo:
          engrossamento?.tecnica === "engrossada" ? engrossamento.larguraSarrafo : SARRAFO_LARGURA_PADRAO,
      });
    } else {
      onChange({ tecnica: "dobrada", nivel: engrossamento?.nivel ?? 1 });
    }
  }

  function mudarNivel(nivel: NivelEngrossamento) {
    if (!engrossamento) return;
    onChange({ ...engrossamento, nivel });
  }

  const ladosSelecionados = engrossamento?.tecnica === "engrossada" ? engrossamento.lados : [];

  return (
    <div
      className={
        aberta
          ? "rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs"
          : "cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:bg-cinza-100"
      }
    >
      <SecaoHeader titulo="Engrossamento" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="campos">
            <div>
              <label>Técnica</label>
              <select
                value={tecnica}
                onChange={(e) => mudarTecnica(e.target.value as "nenhum" | "engrossada" | "dobrada")}
              >
                <option value="nenhum">Nenhum</option>
                <option value="engrossada">Engrossada (sarrafos nas bordas)</option>
                <option value="dobrada">Dobrada (placas laminadas)</option>
              </select>
            </div>
            {engrossamento && (
              <div>
                <label>Nível</label>
                <select
                  value={engrossamento.nivel}
                  onChange={(e) => mudarNivel(Number(e.target.value) as NivelEngrossamento)}
                >
                  {niveisDisponiveis.map((n) => (
                    <option key={n} value={n}>
                      Nível {n} ({espessuraBase * (1 + n)}mm)
                    </option>
                  ))}
                </select>
              </div>
            )}
            {engrossamento?.tecnica === "engrossada" && (
              <div>
                <label>Largura do sarrafo (mm)</label>
                <input
                  type="number"
                  min={1}
                  value={engrossamento.larguraSarrafo ?? SARRAFO_LARGURA_PADRAO}
                  onChange={(e) => onChange({ ...engrossamento, larguraSarrafo: Number(e.target.value) })}
                />
              </div>
            )}
          </div>

          {engrossamento?.tecnica === "engrossada" && (
            <div style={{ marginTop: 10 }}>
              <label>Lados selecionados</label>
              {ladosSelecionados.length === 0 ? (
                <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  Nenhum lado selecionado ainda — clique na referência visual à direita.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1" style={{ marginTop: 4 }}>
                  {ladosSelecionados.map((l) => (
                    <span
                      key={l}
                      className="rounded-sm border border-accent-border bg-accent-subtle px-2 py-1 text-legenda text-accent"
                    >
                      {RÓTULO_LADO[l]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="acoes" style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="primary" onClick={onSalvar}>
              Salvar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
