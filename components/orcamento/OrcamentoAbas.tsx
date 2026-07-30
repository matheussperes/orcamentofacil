"use client";

import { FileText, LayoutGrid, Scissors, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AmbientesLab } from "@/components/ambientes/AmbientesLab";
import { AbaPlaceholder } from "./AbaPlaceholder";
import { usePageHeader } from "@/components/shell/PageHeaderContext";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — shell de
// `/orcamento/[id]`: 4 abas (Design-System Seção 7.8, estilo underline).
// Só "Ambientes" está viva (aba migrada de `app/ambientes/page.tsx`); as
// outras 3 são placeholder ("Em construção") — a task explicitamente pediu
// só a estrutura para elas.
//
// `forceMount` só na aba "Ambientes": as outras 3 são estáticas (sem
// estado), então desmontar/remontar ao trocar de aba não perde nada — não
// há motivo para pagar o custo de renderizá-las sempre ocultas. Já
// "Ambientes" (`AmbientesLab`) tem estado profundo em memória (parede,
// itens, elementos contínuos) que precisaria recarregar do localStorage a
// cada troca de aba se desmontasse — `forceMount` + `data-[state=inactive]:
// hidden` mantém o componente montado (e portanto seu React state intacto)
// enquanto só alterna a visibilidade via CSS.
export interface OrcamentoAbasProps {
  orcamentoId: string;
  clienteNome: string;
  /** Id curto (8 primeiros caracteres do uuid, maiúsculo) — usado só como
   * fallback de exibição; hoje `clienteNome` sempre existe (coluna
   * `cliente.nome` é NOT NULL), mas mantemos o fallback pela mesma razão
   * defensiva de `lib/dashboard/orcamentos.ts` (Task 13.3b). */
  idCurto: string;
}

export function OrcamentoAbas({ orcamentoId, clienteNome, idCurto }: OrcamentoAbasProps) {
  // Sobrescreve a Topbar com o breadcrumb "Orçamentos / <nome do cliente>"
  // (Design-System Seção 6) enquanto esta página estiver montada — ver
  // `components/shell/PageHeaderContext.tsx`.
  usePageHeader({
    breadcrumb: [
      { rotulo: "Orçamentos" },
      { rotulo: clienteNome || `Orçamento #${idCurto}` },
    ],
  });

  return (
    <Tabs defaultValue="ambientes">
      <TabsList>
        <TabsTrigger value="ambientes">
          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          Ambientes
        </TabsTrigger>
        <TabsTrigger value="corte-material">
          <Scissors className="h-4 w-4" aria-hidden="true" />
          Corte & Material
        </TabsTrigger>
        <TabsTrigger value="financeiro">
          <Wallet className="h-4 w-4" aria-hidden="true" />
          Financeiro
        </TabsTrigger>
        <TabsTrigger value="proposta">
          <FileText className="h-4 w-4" aria-hidden="true" />
          Proposta
        </TabsTrigger>
      </TabsList>

      <TabsContent value="ambientes" forceMount className="data-[state=inactive]:hidden">
        <AmbientesLab chavePrefixo={orcamentoId} />
      </TabsContent>
      <TabsContent value="corte-material">
        <AbaPlaceholder titulo="Corte & Material" task="13.4" />
      </TabsContent>
      <TabsContent value="financeiro">
        <AbaPlaceholder titulo="Financeiro" task="13.5" />
      </TabsContent>
      <TabsContent value="proposta">
        <AbaPlaceholder titulo="Proposta" task="13.6" />
      </TabsContent>
    </Tabs>
  );
}
