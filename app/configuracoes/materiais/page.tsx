"use client";

import { useEffect, useState } from "react";
import {
  CATALOGO_PADRAO,
  carregarCatalogo,
  salvarCatalogo,
  type AcabamentoMdf,
  type Catalogo,
} from "@/lib/catalog";

// V2-6 — Cadastro de materiais e produtos. Persiste no localStorage (MVP); a
// versão final grava nas tabelas Prisma. O motor de custos consome estes preços.

let seq = 1;
const novoId = () => `mdf${Date.now()}${seq++}`;

export default function ConfigMateriais() {
  const [cat, setCat] = useState<Catalogo | null>(null);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => setCat(carregarCatalogo()), []);

  if (!cat) return null;

  function set(patch: Partial<Catalogo>) {
    setCat((c) => (c ? { ...c, ...patch } : c));
    setSalvo(false);
  }
  function setMdf(id: string, patch: Partial<AcabamentoMdf>) {
    set({ mdf: cat!.mdf.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  }
  function addMdf() {
    set({
      mdf: [
        ...cat!.mdf,
        { id: novoId(), cor: "Nova cor", espessura: 18, precoChapa: 300 },
      ],
    });
  }
  function removeMdf(id: string) {
    set({ mdf: cat!.mdf.filter((m) => m.id !== id) });
  }

  function salvar() {
    salvarCatalogo(cat!);
    setSalvo(true);
  }
  function restaurar() {
    setCat(CATALOGO_PADRAO);
    setSalvo(false);
  }

  return (
    <div className="wrap">
      <header className="top">
        <h1>Materiais e produtos</h1>
        <p>
          Cadastro de insumos e preços que alimentam o motor de custos.{" "}
          <a href="/">← voltar à calculadora</a> ·{" "}
          <a href="/configuracoes/engenharia">Engenharia dos módulos →</a>
        </p>
      </header>

      <div className="toolbar">
        <button className="primary" onClick={salvar}>
          {salvo ? "Salvo ✓" : "Salvar catálogo"}
        </button>
        <button className="ghost" onClick={restaurar}>
          Restaurar padrão
        </button>
      </div>

      <div className="card">
        <h2>Chapas de MDF (por cor × espessura)</h2>
        <table>
          <thead>
            <tr>
              <th>Cor / Acabamento</th>
              <th>Espessura</th>
              <th>Fornecedor</th>
              <th className="num">Preço/chapa (R$)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cat.mdf.map((m) => (
              <tr key={m.id}>
                <td>
                  <input
                    value={m.cor}
                    onChange={(e) => setMdf(m.id, { cor: e.target.value })}
                  />
                </td>
                <td style={{ width: 110 }}>
                  <select
                    value={m.espessura}
                    onChange={(e) => setMdf(m.id, { espessura: Number(e.target.value) })}
                  >
                    {[6, 15, 18].map((e) => (
                      <option key={e} value={e}>
                        {e} mm
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    value={m.fornecedor ?? ""}
                    placeholder="—"
                    onChange={(e) => setMdf(m.id, { fornecedor: e.target.value })}
                  />
                </td>
                <td style={{ width: 130 }}>
                  <input
                    type="number"
                    value={m.precoChapa}
                    onChange={(e) => setMdf(m.id, { precoChapa: Number(e.target.value) })}
                  />
                </td>
                <td style={{ width: 40 }}>
                  <button className="danger" onClick={() => removeMdf(m.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button style={{ marginTop: 10 }} onClick={addMdf}>
          + Adicionar acabamento
        </button>
      </div>

      <div className="card">
        <h2>Ferragens e acessórios</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Código (engine)</th>
              <th className="num">Preço unit. (R$)</th>
            </tr>
          </thead>
          <tbody>
            {cat.ferragens.map((f, i) => (
              <tr key={f.codigo}>
                <td>{f.nome}</td>
                <td>
                  <code>{f.codigo}</code>
                </td>
                <td style={{ width: 130 }}>
                  <input
                    type="number"
                    value={f.preco}
                    onChange={(e) => {
                      const preco = Number(e.target.value);
                      set({
                        ferragens: cat.ferragens.map((x, j) =>
                          j === i ? { ...x, preco } : x
                        ),
                      });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2>Outros custos</h2>
        <div className="campos">
          <div>
            <label>Fita de borda (R$/m)</label>
            <input
              type="number"
              value={cat.fitaMetro}
              onChange={(e) => set({ fitaMetro: Number(e.target.value) })}
            />
          </div>
          <div>
            <label>Montagem (R$/m²)</label>
            <input
              type="number"
              value={cat.montagemPorM2}
              onChange={(e) => set({ montagemPorM2: Number(e.target.value) })}
            />
          </div>
          <div>
            <label>Frete fixo (R$)</label>
            <input
              type="number"
              value={cat.freteFixo}
              onChange={(e) => set({ freteFixo: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
