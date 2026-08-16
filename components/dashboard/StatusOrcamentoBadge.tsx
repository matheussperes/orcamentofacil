import { Badge } from "@/components/ui/badge";
import type { StatusOrcamento } from "@/lib/dashboard/orcamentos";
import type { EtapaEsteira } from "@/lib/orcamento/etapa-esteira";

// Task 13.3b — mapeia o status REAL de `orcamento` (banco, 4 valores:
// supabase/migrations/20260727090300_orcamento.sql) para a variante de
// `Badge` (Design-System.md Seção 2.5/7.6).
//
// Divergência documentada com a Seção 2.5 do Design-System: a tabela de
// mapeamento canônico de lá lista 5 status (Rascunho, Em andamento, Enviado,
// Aprovado, Fechado) — nenhum deles é "recusado", e o banco não tem
// "em-andamento"/"fechado". Contrato da Task 13.3b: "usar os 4 status reais
// do banco como verdade, não inventar em-andamento/fechado". Para
// "recusado" (que a Seção 2.5 não cobre), a decisão do Frontend Engineer
// nesta task foi reaproveitar a semântica `erro` (vermelho) — é a única cor
// semântica que já existe no Design-System com o significado "negativo/
// rejeitado", condizente com "cliente recusou o orçamento". Reportar ao
// Maestro/Product Designer se um tratamento oficial for definido depois.
const ROTULO: Record<StatusOrcamento, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
};

const VARIANTE: Record<StatusOrcamento, "rascunho" | "enviado" | "aprovado" | "erro"> = {
  rascunho: "rascunho",
  enviado: "enviado",
  aprovado: "aprovado",
  recusado: "erro",
};

// Task 5.10-front (Modelo-de-Dominio.md Seção 7.2, Q-15) — `rotuloDoCard`
// decide qual dos 5 badges da Design-System §2.5 aparece: "Em andamento" e
// "Fechado" vêm de `etapaEsteira`; "Rascunho"/"Enviado"/"Aprovado"/"Recusado"
// continuam vindo de `status` quando `etapaEsteira === "novo"`. Função pura,
// determinística, total — implementada exatamente conforme a tabela de
// decisão do domínio, sem desvio.
export function rotuloDoCard(
  status: StatusOrcamento,
  etapaEsteira: EtapaEsteira
): { rotulo: string; variante: "rascunho" | "enviado" | "aprovado" | "erro" | "em-andamento" | "fechado" } {
  if (etapaEsteira === "fechado") {
    return { rotulo: "Fechado", variante: "fechado" };
  }
  if (etapaEsteira === "visita_agendada" || etapaEsteira === "projeto_3d" || etapaEsteira === "aguardando_aprovacao") {
    return { rotulo: "Em andamento", variante: "em-andamento" };
  }
  return { rotulo: ROTULO[status], variante: VARIANTE[status] };
}

export function StatusOrcamentoBadge({
  status,
  etapaEsteira,
}: {
  status: StatusOrcamento;
  etapaEsteira: EtapaEsteira;
}) {
  const { rotulo, variante } = rotuloDoCard(status, etapaEsteira);
  return <Badge variant={variante}>{rotulo}</Badge>;
}
