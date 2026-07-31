import { notFound } from "next/navigation";
import { Shell } from "@/components/shell/Shell";
import { CatalogoMock, CatalogoMockErro } from "@/components/catalogo/CatalogoMock";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — harness DEV-ONLY:
// renderiza o shell v3 + `/catalogo` (CRUD de chapas/ferragens/fita/LEDs/
// acessórios) com dados MOCK (sem Supabase), mesmo espírito de
// `app/dev/preview/perfil/page.tsx` (Task 13.7a). Guarda dura: 404 em
// produção + rota listada em `lib/auth/rotas.ts::ROTAS_PUBLICAS`.
//
// `?erro=1` — auditoria do estado de erro de carregamento (Design-System
// Seção 8), mesmo padrão do `?erro=1` do `/dev/preview/perfil`.
export default function DevPreviewCatalogoPage({ searchParams }: { searchParams: { erro?: string } }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <Shell user={{ nome: "Usuário de teste", organizacao: "Organização de teste" }}>
      {searchParams.erro ? <CatalogoMockErro /> : <CatalogoMock />}
    </Shell>
  );
}
