import { listarProdutos } from "@/lib/produto/listar";
import { CatalogoConectado } from "@/components/catalogo/CatalogoConectado";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — `/catalogo`
// (`docs/Mapa-de-Telas.md` Seção 3.4), dentro do shell autenticado
// `app/(app)/layout.tsx`. Server Component: só busca os dados
// (`listarProdutos`) e delega o render ao presentational `CatalogoLab` (via
// `CatalogoConectado`) — mesmo espírito de `app/(app)/perfil/page.tsx`
// (Task 13.7a): fetch e render deliberadamente separados para o harness
// `/dev/preview/catalogo` poder renderizar o mesmo `CatalogoLab` com dados
// mock, sem Supabase.
export default async function CatalogoPage() {
  const { produtos, erro } = await listarProdutos();

  return <CatalogoConectado produtosIniciais={produtos} erroCarregamento={erro} />;
}
