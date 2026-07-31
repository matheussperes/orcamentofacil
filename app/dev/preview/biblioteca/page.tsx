import { notFound } from "next/navigation";
import { Shell } from "@/components/shell/Shell";
import { GabaritoMock, GabaritoMockErro } from "@/components/biblioteca/GabaritoMock";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — harness DEV-ONLY:
// renderiza o shell v3 + `/biblioteca` (CRUD de gabaritos: base global +
// próprios da org, D-15) com dados MOCK (sem Supabase), mesmo espírito de
// `app/dev/preview/catalogo/page.tsx` (Task 13.7b). Guarda dura: 404 em
// produção + rota listada em `lib/auth/rotas.ts::ROTAS_PUBLICAS`.
//
// `?erro=1` — auditoria do estado de erro de carregamento (Design-System
// Seção 8), mesmo padrão do `?erro=1` do `/dev/preview/catalogo`.
export default function DevPreviewBibliotecaPage({ searchParams }: { searchParams: { erro?: string } }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <Shell user={{ nome: "Usuário de teste", organizacao: "Organização de teste" }}>
      {searchParams.erro ? <GabaritoMockErro /> : <GabaritoMock />}
    </Shell>
  );
}
