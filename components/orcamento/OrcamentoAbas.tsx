"use client";

import { useState, type ReactNode } from "react";
import { FileText, LayoutGrid, Scissors, Wallet } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AbaPlaceholder } from "./AbaPlaceholder";
import { AbaAtivaProvider } from "./AbaAtivaContext";
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
// "Ambientes" tem estado profundo em memória (parede, itens, elementos
// contínuos) que se perderia ao desmontar — `forceMount` + `data-
// [state=inactive]:hidden` mantém o componente montado (e portanto seu
// React state intacto) enquanto só alterna a visibilidade via CSS.
//
// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md): `OrcamentoAbas` NÃO
// sabe mais de onde vem o conteúdo da aba "Ambientes" nem para onde ele
// salva (Supabase, mock, localStorage) — recebe pronto via `abaAmbientes`
// (slot). Isso deixa o caller (a página real `/orcamento/[id]`, o harness
// `/dev/preview/orcamento`) decidir qual "dono de I/O" usar
// (`AmbientesTabConectada`/`AmbientesTabMock`), sem este componente precisar
// conhecer `EstadoAmbiente`/Supabase.
//
// Task 13.4 (contrato .maestro/tmp/13.4-contract.md): mesma lógica de slot
// agora vale para "Corte & Material" (`abaCorteMaterial`), que também ganha
// `forceMount` — `CorteMaterialTabConectada` guarda itens manuais/resultado
// de congelamento em `useState` local, que também não deve se perder ao
// trocar de aba (mesma razão de "Ambientes"). Além disso, `Tabs` passou de
// não-controlado (`defaultValue`) para controlado (`value`/`onValueChange`)
// para permitir que conteúdo de uma aba peça a troca para outra
// (`AbaAtivaProvider`/`useIrParaAba`, ver `AbaAtivaContext.tsx`) — usado pelo
// estado vazio do plano de corte ("Ir para Ambientes").
//
// Task 13.5 (contrato .maestro/tmp/13.5-contract.md): mesmo slot pattern
// para "Financeiro" (`abaFinanceiro`), também `forceMount` — `FinanceiroLab`
// guarda a configuração de precificação/montagem/frete em edição em
// `useState` local, que não deve se perder ao trocar de aba.
export interface OrcamentoAbasProps {
  clienteNome: string;
  /** Id curto (8 primeiros caracteres do uuid, maiúsculo) — usado só como
   * fallback de exibição; hoje `clienteNome` sempre existe (coluna
   * `cliente.nome` é NOT NULL), mas mantemos o fallback pela mesma razão
   * defensiva de `lib/dashboard/orcamentos.ts` (Task 13.3b). */
  idCurto: string;
  /** Conteúdo da aba "Ambientes" — o caller monta `AmbientesTabConectada`
   * (real, Supabase) ou `AmbientesTabMock` (harness), já com o estado
   * carregado/`onSalvar` resolvidos. */
  abaAmbientes: ReactNode;
  /** Conteúdo da aba "Corte & Material" — o caller monta
   * `CorteMaterialTabConectada` (real, Supabase) ou `CorteMaterialTabMock`
   * (harness). Mesmo espírito de `abaAmbientes`: `OrcamentoAbas` não sabe de
   * onde vem o dado nem para onde ele congela. */
  abaCorteMaterial: ReactNode;
  /** Conteúdo da aba "Financeiro" — Task 13.5, mesmo espírito das outras
   * duas: `FinanceiroTabConectada` (real) ou `FinanceiroTabMock` (harness). */
  abaFinanceiro: ReactNode;
}

export function OrcamentoAbas({ clienteNome, idCurto, abaAmbientes, abaCorteMaterial, abaFinanceiro }: OrcamentoAbasProps) {
  // Sobrescreve a Topbar com o breadcrumb "Orçamentos / <nome do cliente>"
  // (Design-System Seção 6) enquanto esta página estiver montada — ver
  // `components/shell/PageHeaderContext.tsx`.
  usePageHeader({
    breadcrumb: [
      { rotulo: "Orçamentos" },
      { rotulo: clienteNome || `Orçamento #${idCurto}` },
    ],
  });

  const [abaAtiva, setAbaAtiva] = useState("ambientes");

  return (
    <AbaAtivaProvider value={setAbaAtiva}>
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
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
          {abaAmbientes}
        </TabsContent>
        <TabsContent value="corte-material" forceMount className="data-[state=inactive]:hidden">
          {abaCorteMaterial}
        </TabsContent>
        <TabsContent value="financeiro" forceMount className="data-[state=inactive]:hidden">
          {abaFinanceiro}
        </TabsContent>
        <TabsContent value="proposta">
          <AbaPlaceholder titulo="Proposta" task="13.6" />
        </TabsContent>
      </Tabs>
    </AbaAtivaProvider>
  );
}
