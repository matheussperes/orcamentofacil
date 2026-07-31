"use client";

import Link from "next/link";
import { Box, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExcluirGabaritoDialog } from "./ExcluirGabaritoDialog";
import { ehGabaritoGlobal, type GabaritoRow } from "@/lib/gabarito/tipos";
import type { CarcassType } from "@/lib/engine/box/types";

const ROTULOS_TIPO: Record<CarcassType, string> = {
  aereo: "Aéreo",
  inferior: "Inferior",
  torre: "Torre",
};

export interface GabaritoCardProps {
  gabarito: GabaritoRow;
  onExcluir: (id: string) => Promise<{ ok: boolean; erro?: string }>;
  onExcluido: (id: string) => void;
}

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — card de um gabarito
// na grade de `/biblioteca` (mockup `docs/Imagem das Telas/5.Biblioteca.png`).
//
// Decisão de escopo (sem resposta explícita no contrato, documentada aqui):
// sem thumbnail/render real do módulo — não existe hoje nenhum pipeline que
// gere uma imagem de um `BoxModule` fora do canvas técnico já aberto no
// editor (`BoxCanvas.tsx`, que só desenha ao vivo, dentro de `/modulo`).
// Construir esse pipeline (capturar um render 2D de cada gabarito e
// persistir, no mesmo espírito de `lib/linha-proposta/storage.ts` da Task
// 13.6a) é trabalho novo não pedido por este contrato — o placeholder abaixo
// segue o tratamento de "aguardando imagem" já especificado (Design-System.md
// Seção 7.19: `aspect-square`, `bg-cinza-100`, `rounded-md`,
// `border-cinza-200`), não um ícone decorativo qualquer.
export function GabaritoCard({ gabarito, onExcluir, onExcluido }: GabaritoCardProps) {
  const global = ehGabaritoGlobal(gabarito);
  const box = gabarito.definicao;

  async function excluir() {
    const resultado = await onExcluir(gabarito.id);
    if (resultado.ok) onExcluido(gabarito.id);
    return resultado;
  }

  return (
    <div className="flex flex-col gap-sm rounded-lg border border-cinza-200 bg-cinza-0 p-lg shadow-xs transition-shadow duration-150 hover:shadow-sm">
      <Badge variant={global ? "neutro" : "sucesso-solido"} className="w-fit">
        {global ? "Global" : "Seu módulo"}
      </Badge>

      <div className="flex aspect-square items-center justify-center rounded-md border border-cinza-200 bg-cinza-100">
        <Box className="h-8 w-8 text-cinza-300" aria-hidden="true" />
      </div>

      <div>
        <h3 className="text-titulo-card text-cinza-900">{gabarito.nome}</h3>
        <p className="text-corpo-pequeno text-cinza-500">
          {gabarito.categoria} · {ROTULOS_TIPO[box.tipo] ?? box.tipo}
        </p>
        <p className="text-corpo-pequeno tabular-nums text-cinza-500">
          {box.largura} x {box.altura} x {box.profundidade} mm
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-sm pt-sm">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/modulo?preset=${gabarito.id}`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Abrir no editor
          </Link>
        </Button>
        {/* RLS (`gabarito_delete_propria_org`) já bloquearia excluir uma linha
            global — escondida aqui pra não deixar o usuário nem tentar
            (Design-System.md Seção 11). */}
        {!global && <ExcluirGabaritoDialog nomeGabarito={gabarito.nome} onConfirmar={excluir} />}
      </div>
    </div>
  );
}
