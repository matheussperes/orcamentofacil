import { carregarPerfilOrganizacao } from "@/lib/perfil/carregar";
import { PerfilConectado } from "@/components/perfil/PerfilConectado";

// Task 13.7a (contrato .maestro/tmp/13.7a-contract.md) — `/perfil`
// (`docs/Mapa-de-Telas.md` Seção 3.3), dentro do shell autenticado
// `app/(app)/layout.tsx`. Server Component: só busca os dados
// (`carregarPerfilOrganizacao`) e delega o render ao presentational
// `PerfilLab` (via `PerfilConectado`) — mesmo espírito de
// `app/(app)/page.tsx` (Dashboard), fetch e render deliberadamente
// separados para o harness `/dev/preview/perfil` poder renderizar o mesmo
// `PerfilLab` com dados mock, sem Supabase.
//
// Sem `notFound()` aqui: ao contrário de `/orcamento/[id]`, esta rota não
// tem segmento dinâmico que possa "não existir" — um usuário autenticado
// (garantido pelo gate de `middleware.ts`) sempre tem alguma coisa pra
// mostrar; o cenário de borda (organização não resolvível) vira estado de
// erro dentro de `PerfilLab`, não 404 da rota inteira (a seção "Perfil
// pessoal" continua utilizável mesmo nesse cenário).
// Task 4.12-4.13-front (RF-31) — `searchParams.definirSenha === "1"` sinaliza
// que o usuário voltou do link de confirmação de troca de senha
// (`app/auth/confirm/route.ts` redireciona pra cá com esse parâmetro); a
// prop é threaded até `SecaoSeguranca` mesmo padrão de `organizacaoInicial`/
// `perfilInicial` acima.
export default async function PerfilPage({
  searchParams,
}: {
  searchParams: { definirSenha?: string };
}) {
  const dados = await carregarPerfilOrganizacao();

  return (
    <PerfilConectado
      organizacaoInicial={dados?.organizacao ?? null}
      perfilInicial={dados?.perfil ?? { id: "", nome: "", telefone: "", email: "", fotoUrl: "" }}
      definirSenhaInicial={searchParams.definirSenha === "1"}
    />
  );
}
