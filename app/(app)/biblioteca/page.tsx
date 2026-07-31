import { listarGabaritos } from "@/lib/gabarito/listar";
import { GabaritoConectado } from "@/components/biblioteca/GabaritoConectado";

// Task 13.7c (contrato .maestro/tmp/13.7c-contract.md) — `/biblioteca`
// (`docs/Mapa-de-Telas.md` Seção 3.5), agora DENTRO do shell autenticado
// `app/(app)/layout.tsx` (antes vivia em `app/biblioteca/page.tsx`, fora do
// grupo `(app)`, sem sidebar/topbar — a URL não muda, só o layout; o item
// "Biblioteca" do menu já apontava pra `/biblioteca`). Server Component: só
// busca os dados (`listarGabaritos`) e delega o render ao presentational
// `GabaritoLab` (via `GabaritoConectado`) — mesmo espírito de
// `app/(app)/catalogo/page.tsx` (Task 13.7b): fetch e render deliberadamente
// separados para o harness `/dev/preview/biblioteca` poder renderizar o
// mesmo `GabaritoLab` com dados mock, sem Supabase.
export default async function BibliotecaPage() {
  const { gabaritos, erro } = await listarGabaritos();

  return <GabaritoConectado gabaritosIniciais={gabaritos} erroCarregamento={erro} />;
}
