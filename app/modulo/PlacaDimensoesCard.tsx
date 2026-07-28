"use client";

import type { Catalogo } from "@/lib/catalog";
import { espessurasDaCor } from "@/lib/catalog";
import type { Placa } from "@/lib/engine/placa/types";
import { SecaoHeader } from "./SecaoHeader";

// Task 13.1 — seção "dimensoesMaterial" do Editor de Item para Placa
// (capacidades "dimensoes" + "material", Modelo de Domínio Seção 4). O
// sentido do veio (Seção 8) fica só como um toggle Sim/Não de
// `material.temVeio` aqui — a DIREÇÃO em si (`placa.sentidoVeio`) é editada
// no controle visual do painel direito (`PlacaVisual`), só quando temVeio é
// true, conforme o requisito de UX do contrato.
export function PlacaDimensoesCard({
  placa,
  cores,
  catalogo,
  onChange,
  aberta,
  onAbrir,
  onSalvar,
}: {
  placa: Placa;
  cores: string[];
  catalogo: Catalogo | null;
  onChange: (patch: Partial<Placa>) => void;
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
      <SecaoHeader titulo="Dimensões e material" aberta={aberta} onAbrir={onAbrir} />
      {aberta && (
        <>
          <div className="campos">
            <div>
              <label>Nome</label>
              <input value={placa.nome} onChange={(e) => onChange({ nome: e.target.value })} />
            </div>
            <div>
              <label>Largura (mm)</label>
              <input
                type="number"
                value={placa.largura}
                onChange={(e) => onChange({ largura: Number(e.target.value) })}
              />
            </div>
            <div>
              <label>Altura (mm)</label>
              <input
                type="number"
                value={placa.altura}
                onChange={(e) => onChange({ altura: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="campos" style={{ marginTop: 8 }}>
            <div>
              <label>Cor</label>
              <select
                value={placa.material.cor}
                onChange={(e) => onChange({ material: { ...placa.material, cor: e.target.value } })}
              >
                {cores.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Espessura (base)</label>
              <select
                value={placa.material.espessura}
                onChange={(e) =>
                  onChange({ material: { ...placa.material, espessura: Number(e.target.value) } })
                }
              >
                {(catalogo ? espessurasDaCor(catalogo, placa.material.cor) : [15, 18]).map((esp) => (
                  <option key={esp} value={esp}>
                    {esp} mm
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Material tem veio</label>
              <select
                value={placa.material.temVeio ? "s" : "n"}
                onChange={(e) =>
                  onChange({ material: { ...placa.material, temVeio: e.target.value === "s" } })
                }
              >
                <option value="n">Não</option>
                <option value="s">Sim</option>
              </select>
            </div>
          </div>

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
