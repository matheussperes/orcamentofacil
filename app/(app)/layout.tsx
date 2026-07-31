import { createClient } from "@/lib/supabase/server";
import { Shell } from "@/components/shell/Shell";

// Task 13.3b (contrato .maestro/tmp/13.3b-contract.md) — route group `(app)`:
// aplica o shell autenticado v3 (sidebar + topbar) a rotas autenticadas reais
// sem afetar a URL (`(app)/page.tsx` continua servindo `/`). Escolhido em vez
// de repetir `<Shell>` em cada `page.tsx` porque é o padrão idiomático do App
// Router pra layout compartilhado — o contrato deixou a escolha a critério
// do Frontend Engineer.
//
// Escopo original (Task 13.3b): só o Dashboard (`app/(app)/page.tsx`) morava
// dentro deste grupo. `/modulo`, `/ambientes`, `/biblioteca` e
// `/configuracoes/materiais` (laboratórios/telas Stage 12-13 anteriores)
// continuavam fora dele — CSS legado (`.wrap`/`.card`, ver
// `app/globals.css`) e não eram destinos do menu principal em
// `docs/Mapa-de-Telas.md` ainda ligados a dados reais; envolvê-los no shell
// exigiria redesenhar cada uma para não duplicar cabeçalho/voltar. Registrado
// no relatório para o Maestro decidir sequenciamento de retrofit futuro.
//
// Atualização (Task 13.7c, contrato .maestro/tmp/13.7c-contract.md):
// `/biblioteca` (`app/(app)/biblioteca/page.tsx`) migrou pra dentro deste
// grupo — CRUD real de `gabarito` (Supabase), com sidebar/topbar do shell.
// `/modulo` e `/ambientes` continuam FORA (mesma Task 13.7c religou os dados
// de `/modulo` ao Supabase, sem retrofit visual pro shell — fora do escopo
// de "religar dados").
//
// Título/subtítulo da topbar: resolvidos por rota dentro de `Topbar.tsx`
// (mapa simples via `usePathname`), não passados por aqui — ver comentário
// em `components/shell/Topbar.tsx`.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nome = user?.email ?? "Usuário";
  let organizacao = "—";

  if (user) {
    const { data: perfil } = await supabase
      .from("perfil")
      .select("nome, organizacao(nome)")
      .eq("id", user.id)
      .maybeSingle();

    if (perfil) {
      const nomePerfil = (perfil.nome as string | null)?.trim();
      nome = nomePerfil && nomePerfil.length > 0 ? nomePerfil : user.email ?? "Usuário";

      const orgAninhada = perfil.organizacao as { nome: string } | { nome: string }[] | null;
      const org = Array.isArray(orgAninhada) ? orgAninhada[0] : orgAninhada;
      organizacao = org?.nome ?? "—";
    }
  }

  return <Shell user={{ nome, organizacao }}>{children}</Shell>;
}
