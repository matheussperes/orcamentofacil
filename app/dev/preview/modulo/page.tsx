import { notFound } from "next/navigation";
import { Shell } from "@/components/shell/Shell";
import EditorModulo from "@/app/(app)/modulo/page";

// Task 5.1-5.4 (contrato .maestro/state/contracts/5.1-5.4.md, RF-35) —
// harness DEV-ONLY: `/modulo` exige sessão (gate de `middleware.ts`) e o
// ux-auditor audita sem sessão real. `EditorModulo` não recebe props e já
// funciona sem Supabase real quando não há `?preset=` na URL (usa
// `carregarCatalogo()` localStorage-first) — mesmo padrão de
// `app/dev/preview/orcamento/page.tsx`. 404 em produção + rota pública no
// gate (`lib/auth/rotas.ts`), mesma guarda das demais rotas `/dev/preview/*`.
export default function DevPreviewModuloPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <Shell user={{ nome: "Usuário de teste", organizacao: "Organização de teste" }}>
      <EditorModulo />
    </Shell>
  );
}
