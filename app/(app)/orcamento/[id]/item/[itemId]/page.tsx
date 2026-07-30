import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buscarItemDoOrcamento } from "@/lib/orcamento/buscar";
import { Button } from "@/components/ui/button";
import { ItemEditorTabConectada } from "@/components/orcamento/ItemEditorTabConectada";

// Task 13.3e (contrato .maestro/tmp/13.3e-contract.md) — edição de UM item
// real (`ModuloOrcamento`) dentro de `orcamento.itens` (jsonb, gravado desde
// a Task 13.3d). Server Component: busca orçamento + item
// (`lib/orcamento/buscar.ts::buscarItemDoOrcamento`, RLS escopa por
// organização) e devolve `notFound()` (404) quando o orçamento não existe/não
// é seu OU quando não há item com esse `itemId` — os três casos são
// indistinguíveis de propósito (ver comentário de `buscarItemDoOrcamento`).
//
// Dentro do shell autenticado v3 (route group `(app)`, herda sidebar/topbar
// de `app/(app)/layout.tsx`) — nenhum `<Shell>` próprio aqui.
export default async function ItemOrcamentoPage({
  params,
}: {
  params: { id: string; itemId: string };
}) {
  const encontrado = await buscarItemDoOrcamento(params.id, params.itemId);

  if (!encontrado) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-lg">
      <Button variant="ghost" size="sm" asChild className="w-fit">
        <Link href={`/orcamento/${params.id}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para o ambiente
        </Link>
      </Button>

      <ItemEditorTabConectada
        orcamentoId={params.id}
        itemId={params.itemId}
        clienteNome={encontrado.orcamento.clienteNome}
        estadoInicial={encontrado.item}
      />
    </div>
  );
}
