"use client";

import { Pencil } from "lucide-react";

// Cabeçalho clicável usado por todo card de configuração do módulo: quando a
// sessão está colapsada, clicar no título reabre ela (o card some o corpo,
// mas o header continua visível pra permitir voltar e editar).
//
// Task 7.1 — Design-System.md Seção 6.4:
// - "aberta" (etapa atual): 16px/600 `text-cinza-900`, borda inferior
//   separando do corpo, `cursor-default` (não é clicável).
// - "colapsada" (etapa já salva): fundo `bg-cinza-50` (aplicado pelo
//   contêiner do card, ver CaixaCard/DivisoesCard/etc.), texto 14px/500
//   `text-cinza-600`, badge "editar" em `text-accent` com ícone de lápis,
//   `cursor-pointer hover:bg-cinza-100` (hover também no contêiner).
export function SecaoHeader({
  titulo,
  aberta,
  onAbrir,
}: {
  titulo: string;
  aberta: boolean;
  onAbrir: () => void;
}) {
  if (aberta) {
    return (
      <h2 className="mb-4 flex cursor-default items-center justify-between border-b border-cinza-200 pb-3 text-titulo-card font-semibold text-cinza-900">
        {titulo}
      </h2>
    );
  }

  return (
    <h2
      onClick={onAbrir}
      className="flex cursor-pointer items-center justify-between text-corpo font-medium text-cinza-600"
    >
      {titulo}
      <span className="flex items-center gap-1 text-legenda text-accent">
        <Pencil size={12} />
        editar
      </span>
    </h2>
  );
}
