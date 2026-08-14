"use client";

import { useRouter } from "next/navigation";
import { AmbientesLab } from "./AmbientesLab";
import { salvarEstadoAmbiente } from "@/lib/ambiente/salvar";
import { mutarAmbientes } from "@/lib/ambiente/mutar";
import type {
  ComandoAmbiente,
  EstadoAmbiente,
  ResultadoMutarAmbientes,
  ResultadoSalvarAmbiente,
} from "@/lib/ambiente/estado";
import type { ElementoParedePresetRow } from "@/lib/elemento-parede-preset/tipos";
import type { LinhaProposta } from "@/lib/linha-proposta/tipos";

// Task 13.3d (contrato .maestro/tmp/13.3d-contract.md) — o "dono de I/O"
// Supabase de `/orcamento/[id]`: recebe o estado já carregado pelo Server
// Component da rota (`lib/ambiente/carregar.ts`, chamado em
// `app/(app)/orcamento/[id]/page.tsx`) e liga o botão "Salvar alterações" do
// `AmbientesLab` (presentational) ao Server Action `salvarEstadoAmbiente`
// (`lib/ambiente/salvar.ts`). Este é o ÚNICO ponto onde a aba "Ambientes"
// conversa com o Supabase — `AmbientesLab` em si não sabe que este componente
// existe.
//
// Task 1.1–1.3 (contrato .maestro/tmp/1.1-1.3-contract.md) — depois de
// salvar com sucesso, `router.refresh()` reexecuta o Server Component da
// rota (`app/(app)/orcamento/[id]/page.tsx`), que rebusca `estadoAmbiente`
// fresco e o replasa para os 4 slots de `OrcamentoAbas`. `OrcamentoAbas` (o
// Client Component pai) não desmonta com o refresh, então `abaAtiva` e o
// `useState` lazy de `AmbientesLab` (estado de edição em progresso do
// usuário) sobrevivem — só as props derivadas de `estadoAmbiente` mudam de
// referência, o que já é suficiente pros `useMemo` de Corte & Material/
// Financeiro/Proposta reagirem sozinhos (ver comentário do contrato).
export interface AmbientesTabConectadaProps {
  orcamentoId: string;
  estadoInicial: EstadoAmbiente;
  /** Task 2.12 (front) — presets de elemento de parede da organização,
   * carregados server-side (`listarElementoParedePresets`) por
   * `app/(app)/orcamento/[id]/page.tsx` e só repassados adiante. */
  presetsElementoParede: ElementoParedePresetRow[];
  /** Task 2.28-2.30 — Linhas de Proposta do orçamento (já carregadas pelo
   * Server Component da rota, `carregarOuCriarLinhasProposta`), repassadas
   * só para derivar o badge comercial somente-leitura da elevação (ver
   * `AmbientesLab.tsx::derivarTagsComerciais`). */
  linhasProposta: LinhaProposta[];
}

export function AmbientesTabConectada({
  orcamentoId,
  estadoInicial,
  presetsElementoParede,
  linhasProposta,
}: AmbientesTabConectadaProps) {
  const router = useRouter();

  async function onSalvar(estado: EstadoAmbiente): Promise<ResultadoSalvarAmbiente> {
    const resultado = await salvarEstadoAmbiente(orcamentoId, estado);
    if (resultado.ok) {
      router.refresh();
    }
    return resultado;
  }

  // Task 2.3-2.6 — CRUD imediato de ambiente/parede (criar/renomear/excluir/
  // reordenar): NÃO chama `router.refresh()` — a Server Action já devolve a
  // árvore fresca (`resultado.ambientes`) e `AmbientesLab` substitui o estado
  // local direto, sem round-trip do Server Component (evitaria perder edição
  // profunda em progresso na parede selecionada, que só existe em memória até
  // "Salvar alterações").
  async function onMutarAmbientes(comando: ComandoAmbiente): Promise<ResultadoMutarAmbientes> {
    return mutarAmbientes(orcamentoId, comando);
  }

  return (
    <AmbientesLab
      estadoInicial={estadoInicial}
      onSalvar={onSalvar}
      onMutarAmbientes={onMutarAmbientes}
      orcamentoId={orcamentoId}
      presetsElementoParede={presetsElementoParede}
      linhasProposta={linhasProposta}
    />
  );
}
