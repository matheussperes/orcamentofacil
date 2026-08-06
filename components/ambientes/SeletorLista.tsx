"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExcluirAmbienteParedeDialog } from "./ExcluirAmbienteParedeDialog";

export interface ItemSelecionavel {
  id: string;
  nome: string;
}

export interface SeletorListaProps {
  /** Rótulo singular (`ambiente`/`parede`) — usado nas mensagens/aria-labels. */
  rotulo: "ambiente" | "parede";
  /** Rótulo plural exibido como título da seção (`"Ambientes"`/`"Paredes"`). */
  rotuloPlural: string;
  itens: ItemSelecionavel[];
  selecionadoId: string;
  onSelecionar: (id: string) => void;
  onCriar: (nome: string) => void;
  onRenomear: (id: string, nome: string) => void;
  onExcluir: (id: string) => void;
  onMover: (id: string, direcao: "cima" | "baixo") => void;
  /** `true` durante um comando em voo (round-trip ao servidor) — desabilita
   * toda a lista pra evitar dois comandos concorrentes. */
  desabilitado?: boolean;
}

// Task 2.3-2.6 — seletor de ambiente/parede: o MESMO componente cobre os
// dois níveis (só o rótulo muda) — evita duplicar lista+CRUD duas vezes.
// Estilo "Tabs underline" (Design-System §7.8: trigger inativo `text-corpo
// font-medium text-cinza-500 border-b-2 border-transparent`, ativo
// `text-accent border-b-2 border-accent`) para a seleção; lápis/lixeira no
// mesmo padrão já usado em "Elementos de parede"/"Itens posicionados" deste
// módulo. Reordenar é por setas ↑/↓ — não drag-and-drop (o produto não tem
// biblioteca de DnD ainda, e o contrato pede o caminho mais barato já
// disponível). Exclusão sempre passa por `ExcluirAmbienteParedeDialog`
// (§7.11 — nunca `window.confirm`), desabilitada quando só sobra 1 item:
// nunca se pode ficar sem nenhum ambiente/parede selecionável.
export function SeletorLista({
  rotulo,
  rotuloPlural,
  itens,
  selecionadoId,
  onSelecionar,
  onCriar,
  onRenomear,
  onExcluir,
  onMover,
  desabilitado,
}: SeletorListaProps) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [novoNome, setNovoNome] = useState("");

  function iniciarEdicao(item: ItemSelecionavel) {
    setEditandoId(item.id);
    setRascunho(item.nome);
  }

  function confirmarEdicao() {
    const nomeLimpo = rascunho.trim();
    if (editandoId && nomeLimpo) onRenomear(editandoId, nomeLimpo);
    setEditandoId(null);
  }

  function criar() {
    const nomeLimpo = novoNome.trim();
    if (!nomeLimpo) return;
    onCriar(nomeLimpo);
    setNovoNome("");
  }

  return (
    <div className="flex flex-col gap-sm">
      <h3 className="text-legenda text-cinza-500">{rotuloPlural}</h3>
      <div className="flex flex-wrap items-center gap-lg border-b border-cinza-200" role="tablist">
        {itens.map((item, indice) => (
          <div key={item.id} className="flex items-center gap-1 pb-1">
            {editandoId === item.id ? (
              <Input
                autoFocus
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                onBlur={confirmarEdicao}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmarEdicao();
                  if (e.key === "Escape") setEditandoId(null);
                }}
                className="h-7 w-32 text-corpo-pequeno"
              />
            ) : (
              <button
                type="button"
                role="tab"
                aria-selected={item.id === selecionadoId}
                onClick={() => onSelecionar(item.id)}
                disabled={desabilitado}
                className={
                  item.id === selecionadoId
                    ? "border-b-2 border-accent pb-1 text-corpo font-medium text-accent"
                    : "border-b-2 border-transparent pb-1 text-corpo font-medium text-cinza-500 hover:text-cinza-700"
                }
              >
                {item.nome}
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              disabled={desabilitado}
              onClick={() => iniciarEdicao(item)}
              aria-label={`Renomear ${item.nome}`}
            >
              <Pencil size={12} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={desabilitado || indice === 0}
              onClick={() => onMover(item.id, "cima")}
              aria-label={`Mover ${item.nome} para cima`}
            >
              <ChevronUp size={12} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={desabilitado || indice === itens.length - 1}
              onClick={() => onMover(item.id, "baixo")}
              aria-label={`Mover ${item.nome} para baixo`}
            >
              <ChevronDown size={12} />
            </Button>
            <ExcluirAmbienteParedeDialog
              rotulo={rotulo}
              nome={item.nome}
              mensagem={
                rotulo === "ambiente"
                  ? `Excluir "${item.nome}" remove todas as paredes dele. Itens que só existiam nelas saem do orçamento. Esta ação não pode ser desfeita.`
                  : `Excluir "${item.nome}" remove os itens posicionados nela. Esta ação não pode ser desfeita.`
              }
              onConfirmar={() => onExcluir(item.id)}
              disabled={desabilitado || itens.length <= 1}
            />
          </div>
        ))}
      </div>
      <div className="flex items-end gap-sm">
        <Input
          placeholder={`Nome do novo ${rotulo}`}
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && criar()}
          disabled={desabilitado}
          className="h-8 w-48"
        />
        <Button variant="ghost" size="sm" onClick={criar} disabled={desabilitado}>
          <Plus size={14} /> Adicionar {rotulo}
        </Button>
      </div>
    </div>
  );
}
