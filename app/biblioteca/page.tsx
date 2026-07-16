"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listarPresets,
  removerPreset,
  renomearPreset,
  moverPresetDeCategoria,
  seedPresetsPadrao,
  type BoxPreset,
} from "@/lib/boxPresets";
import {
  adicionarCategoria,
  ehCategoriaPadrao,
  listarCategorias,
  removerCategoria,
  renomearCategoria,
} from "@/lib/categorias";
import type { CarcassType } from "@/lib/engine/box/types";

const TIPOS: { value: CarcassType; label: string }[] = [
  { value: "aereo", label: "Aéreo" },
  { value: "inferior", label: "Inferior" },
  { value: "torre", label: "Torre" },
];

export default function BibliotecaModulos() {
  const [presets, setPresets] = useState<BoxPreset[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  useEffect(() => {
    seedPresetsPadrao();
    setPresets(listarPresets());
    setCategorias(listarCategorias());
  }, []);

  const presetsFiltrados = useMemo(
    () =>
      presets.filter(
        (p) =>
          (filtroCategoria === "todas" || p.categoria === filtroCategoria) &&
          (filtroTipo === "todos" || p.box.tipo === filtroTipo)
      ),
    [presets, filtroCategoria, filtroTipo]
  );

  function atualizarCampoLocal(id: string, patch: Partial<BoxPreset>) {
    setPresets((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function salvarNome(p: BoxPreset) {
    renomearPreset(p.id, p.nome);
  }

  function trocarCategoriaPreset(p: BoxPreset, categoria: string) {
    moverPresetDeCategoria(p.id, categoria);
    atualizarCampoLocal(p.id, { categoria });
  }

  function excluirPreset(p: BoxPreset) {
    if (!confirm(`Excluir "${p.nome}"? Essa ação não pode ser desfeita.`)) return;
    removerPreset(p.id);
    setPresets((ps) => ps.filter((x) => x.id !== p.id));
  }

  function adicionarCategoriaNova() {
    if (!novaCategoria.trim()) return;
    adicionarCategoria(novaCategoria);
    setCategorias(listarCategorias());
    setNovaCategoria("");
  }

  function renomearCategoriaExtra(antiga: string) {
    const nova = window.prompt(`Renomear categoria "${antiga}" para:`, antiga);
    if (!nova || !nova.trim() || nova.trim() === antiga) return;
    renomearCategoria(antiga, nova.trim());
    // Presets que usavam a categoria antiga acompanham o novo nome, senão
    // ficariam com uma categoria que não existe mais na lista.
    presets
      .filter((p) => p.categoria === antiga)
      .forEach((p) => moverPresetDeCategoria(p.id, nova.trim()));
    setCategorias(listarCategorias());
    setPresets(listarPresets());
    if (filtroCategoria === antiga) setFiltroCategoria(nova.trim());
  }

  function removerCategoriaExtra(nome: string) {
    const emUso = presets.filter((p) => p.categoria === nome);
    if (emUso.length > 0) {
      alert(`Não dá pra excluir "${nome}": ${emUso.length} módulo(s) ainda estão nessa categoria. Troque a categoria deles primeiro.`);
      return;
    }
    if (!confirm(`Excluir a categoria "${nome}"?`)) return;
    removerCategoria(nome);
    setCategorias(listarCategorias());
  }

  return (
    <div className="wrap">
      <header className="top">
        <h1>Biblioteca de módulos</h1>
        <p>
          Administre categorias/ambientes e os módulos cadastrados no laboratório.{" "}
          <a href="/modulo">← editor de módulo</a> · <a href="/">calculadora</a>
        </p>
      </header>

      <div className="card">
        <h2>Categorias / ambientes</h2>
        <p className="muted" style={{ fontSize: 12, marginTop: -6 }}>
          As 8 categorias padrão são fixas. Categorias criadas por você podem ser renomeadas ou excluídas
          (só se nenhum módulo estiver usando).
        </p>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th className="num">Módulos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c}>
                <td>{c}{ehCategoriaPadrao(c) && <span className="muted"> (padrão)</span>}</td>
                <td className="num">{presets.filter((p) => p.categoria === c).length}</td>
                <td style={{ textAlign: "right" }}>
                  {!ehCategoriaPadrao(c) && (
                    <>
                      <button onClick={() => renomearCategoriaExtra(c)}>Renomear</button>{" "}
                      <button className="danger" onClick={() => removerCategoriaExtra(c)}>Excluir</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="campos" style={{ marginTop: 10 }}>
          <div>
            <label>Nova categoria</label>
            <div style={{ display: "flex", gap: 4 }}>
              <input
                value={novaCategoria}
                placeholder="ex.: Escritório"
                onChange={(e) => setNovaCategoria(e.target.value)}
              />
              <button className="primary" onClick={adicionarCategoriaNova}>+</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Módulos cadastrados ({presetsFiltrados.length})</h2>
        <div className="campos">
          <div>
            <label>Categoria</label>
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
              <option value="todas">Todas</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label>Tipo</label>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
              <option value="todos">Todos</option>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {presetsFiltrados.length === 0 && (
          <p className="muted" style={{ marginTop: 10 }}>Nenhum módulo cadastrado com esse filtro.</p>
        )}

        {presetsFiltrados.length > 0 && (
          <table style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {presetsFiltrados.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      value={p.nome}
                      onChange={(e) => atualizarCampoLocal(p.id, { nome: e.target.value })}
                      onBlur={() => salvarNome(p)}
                      style={{ minWidth: 160 }}
                    />
                  </td>
                  <td>
                    <select value={p.categoria} onChange={(e) => trocarCategoriaPreset(p, e.target.value)}>
                      {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="muted">{TIPOS.find((t) => t.value === p.box.tipo)?.label ?? p.box.tipo}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <a href={`/modulo?preset=${p.id}`}><button>Abrir no editor</button></a>{" "}
                    <button className="danger" onClick={() => excluirPreset(p)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
