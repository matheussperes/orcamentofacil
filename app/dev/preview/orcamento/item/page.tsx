import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Shell } from "@/components/shell/Shell";
import { Button } from "@/components/ui/button";
import { ItemEditorTabMock } from "@/components/orcamento/ItemEditorTabMock";

// Task 13.3e (contrato .maestro/tmp/13.3e-contract.md) — harness DEV-ONLY:
// renderiza `EditorItemNucleo` (via `ItemEditorTabMock`) com um item MOCK
// (sem Supabase), pro Maestro/UX Auditor navegarem sem sessão real. Mesma
// guarda de `app/dev/preview/orcamento/page.tsx` (Task 13.3c/13.3d): 404 em
// produção + rota pública no gate (`lib/auth/rotas.ts`).
export default function DevPreviewItemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <Shell user={{ nome: "Usuário de teste", organizacao: "Organização de teste" }}>
      <div className="flex flex-col gap-lg">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link href="/dev/preview/orcamento">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar para o ambiente
          </Link>
        </Button>

        <ItemEditorTabMock />
      </div>
    </Shell>
  );
}
