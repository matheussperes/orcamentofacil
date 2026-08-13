import { notFound } from "next/navigation";
import { Shell } from "@/components/shell/Shell";
import { PerfilMock, PerfilMockErro } from "@/components/perfil/PerfilMock";

// Task 13.7a (contrato .maestro/tmp/13.7a-contract.md) — harness DEV-ONLY:
// renderiza o shell v3 + `/perfil` (Organização + Perfil pessoal) com dados
// MOCK (sem Supabase), mesmo espírito de `app/dev/preview/page.tsx` (Task
// 13.3b). Guarda dura: 404 em produção + rota listada em
// `lib/auth/rotas.ts::ROTAS_PUBLICAS`.
//
// `?erro=1` — auditoria do estado de erro da seção "Organização" (Design-
// System Seção 8: organização não resolvível, ver `PerfilLab.tsx`), mesmo
// padrão do `?vazio=1` do Dashboard.
//
// `?definirSenha=1` — Task 4.12-4.13-front: auditoria visual do formulário
// "Definir nova senha" da seção "Segurança" sem depender do fluxo real de
// e-mail (mesmo parâmetro que `app/auth/confirm/route.ts` usa em produção).
export default function DevPreviewPerfilPage({
  searchParams,
}: {
  searchParams: { erro?: string; definirSenha?: string };
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <Shell user={{ nome: "Usuário de teste", organizacao: "Organização de teste" }}>
      {searchParams.erro ? (
        <PerfilMockErro />
      ) : (
        <PerfilMock definirSenhaInicial={searchParams.definirSenha === "1"} />
      )}
    </Shell>
  );
}
