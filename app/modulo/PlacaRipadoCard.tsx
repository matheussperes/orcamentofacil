"use client";

import type { Ripado } from "@/lib/engine/placa/types";
import { SecaoHeader } from "./SecaoHeader";

const RIPADO_PADRAO: Ripado = { larguraRipa: 100, quantidade: 6 };

// Task 13.1 — seção "ripado" (capacidade "ripado", Modelo de Domínio Seção
// 2.2 / D-06): usuário informa largura da ripa e quantidade, o espaçamento
// é DERIVADO (`explodePlaca` calcula, não é campo aqui).
export function PlacaRipadoCard({
  ripado,
  onChange,
  aberta,
  onAbrir,
  onSalvar,
}: {
  ripado: Ripado | undefined;
  onChange: (ripado: Ripado | undefined) => void;
  aberta: boolean;
  onAbrir: () => void;
  onSalvar: () => void;
}) {
  return (
    <div
      className={
        aberta
          ? "rounded-lg border border-cinza-200 bg-cinza-0 p-4 shadow-xs"
          : "cursor-pointer rounded-lg border border-cinza-200 bg-cinza-50 p-3 hover:bg-cinza-100"
      }
    >
      <SecaoHeader titulo="Ripado" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="campos">
            <div>
              <label>Ativar ripado</label>
              <select
                value={ripado ? "s" : "n"}
                onChange={(e) => onChange(e.target.value === "s" ? (ripado ?? RIPADO_PADRAO) : undefined)}
              >
                <option value="n">Não</option>
                <option value="s">Sim</option>
              </select>
            </div>
            {ripado && (
              <>
                <div>
                  <label>Largura da ripa (mm)</label>
                  <input
                    type="number"
                    min={1}
                    value={ripado.larguraRipa}
                    onChange={(e) => onChange({ ...ripado, larguraRipa: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label>Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    value={ripado.quantidade}
                    onChange={(e) => onChange({ ...ripado, quantidade: Number(e.target.value) })}
                  />
                </div>
              </>
            )}
          </div>
          {ripado && (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              Espaçamento entre ripas é calculado automaticamente (veja o painel de peças à
              direita).
            </p>
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
