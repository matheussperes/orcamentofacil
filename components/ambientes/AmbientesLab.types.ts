// Task R.3a — tipos extraídos de AmbientesLab.tsx (decomposição pura, sem
// mudança de comportamento).
import type { EstadoAmbiente, ResultadoSalvarAmbiente, ComandoAmbiente, ResultadoMutarAmbientes } from "@/lib/ambiente/estado";
import type { ElementoParedePresetRow } from "@/lib/elemento-parede-preset/tipos";
import type { LinhaProposta } from "@/lib/linha-proposta/tipos";

export interface AmbientesLabProps {
  /** Estado inicial (carregado pelo dono de I/O — Supabase, localStorage ou
   * mock). Só é lido na PRIMEIRA renderização (inicializador preguiçoso do
   * `useState`, mesmo padrão já usado pelos overrides na Task 13.2b) — trocar
   * a prop depois de montado não reseta o estado em edição. */
  estadoInicial: EstadoAmbiente;
  /** Chamado só quando o usuário clica em "Salvar alterações" — NUNCA
   * autosave. Quem implementa decide o destino (Supabase, localStorage,
   * no-op) e como reporta sucesso/erro. */
  onSalvar: (estado: EstadoAmbiente) => Promise<ResultadoSalvarAmbiente>;
  /** Id do orçamento pai — só existe quando este `AmbientesLab` está
   * conectado a um orçamento real (`AmbientesTabConectada`, Task 13.3d).
   * Task 13.3e: quando presente, cada linha de "Itens posicionados" ganha um
   * link "Editar item" pra `/orcamento/[id]/item/[itemId]` (o Editor de Item
   * completo — accordion Caixa/Divisões/Portas/Gavetas/Puxador ou seções de
   * Placa). Ausente em `AmbientesLabStandalone` (`/ambientes`, sem
   * orçamento pai — não há pra onde linkar) e em `AmbientesTabMock` (harness
   * `/dev/preview/orcamento`, sem `orcamentoId`/`itemId` reais que resolvam
   * numa rota que funcione) — decisão de menor esforço documentada no
   * relatório da 13.3e. */
  orcamentoId?: string;
  /** Task 2.3-2.6 — CRUD imediato (criar/renomear/excluir/reordenar) de
   * ambiente/parede: NUNCA autosave, mas também nunca espera o botão
   * "Salvar alterações" (que continua só para o conteúdo profundo — elementos/
   * itens de cada parede). Ausente em `AmbientesLabStandalone`/`AmbientesTabMock`
   * (sem `orcamentoId`/Supabase real) — nesse caso `AmbientesLab` aplica o
   * comando em memória via `aplicarComandoAmbiente` (`lib/ambiente/estado.ts`),
   * mesma função pura usada como referência de comportamento pelos dois
   * caminhos. */
  onMutarAmbientes?: (comando: ComandoAmbiente) => Promise<ResultadoMutarAmbientes>;
  /** Presets de elemento de parede da organização (Task 2.12, Modelo de
   * Domínio 3.2.3), carregados server-side por quem monta este componente
   * (`AmbientesTabConectada`/`app/(app)/orcamento/[id]/page.tsx`) — só
   * existe onde há Supabase real. Ausente em `AmbientesLabStandalone`
   * (`/ambientes`) e `AmbientesTabMock` (harness), que não recebem esta
   * prop: a UI de preset fica vazia/oculta pra eles (mesmo tratamento de
   * `orcamentoId` opcional). */
  presetsElementoParede?: ElementoParedePresetRow[];
  /** Task 2.28-2.30 (RF-37/Q-3) — Linhas de Proposta do orçamento, só para
   * derivar o badge comercial somente-leitura da elevação/painel de
   * conjunto (ver `derivarTagsComerciais`, em `AmbientesLab.helpers.ts`).
   * Ausente em `AmbientesLabStandalone` (`/ambientes`, sem orçamento pai —
   * não há Linha de Proposta pra mostrar) — nesse caso nenhum badge é
   * desenhado (mesmo tratamento de prop opcional já usado por
   * `orcamentoId`/`presetsElementoParede`). */
  linhasProposta?: LinhaProposta[];
}

// Alvo de seleção do painel: um Conjunto (bloco) detectado/ajustado (Task
// 13.2b) ou um item avulso (não pertence a nenhum Conjunto).
export type SelecaoAlvo = { tipo: "conjunto"; conjuntoId: string } | { tipo: "item"; itemId: string };
