import { createClient } from "@/lib/supabase/server";
import type { ModoMontagem, ModoPrecificacao } from "@/lib/engine/precificacao";

// Task 13.7a (contrato .maestro/tmp/13.7a-contract.md) — leitura server-side
// dos dados de `/perfil` (Organização + Perfil pessoal), chamada pelo Server
// Component da rota (`app/(app)/perfil/page.tsx`). Mesmo espírito de
// `lib/precificacao/carregarConfiguracao.ts`/`lib/ambiente/carregar.ts`:
// nunca lança — um usuário sem `perfil`/`organizacao` (não deveria
// acontecer, a trigger `handle_new_user` cria os dois no signup, mas RLS
// pode devolver `null` em cenários de borda) devolve `organizacao: null`,
// que a UI trata como estado de erro (Design-System.md Seção 8) em vez de
// quebrar a página.
//
// `email` NÃO vem de `perfil` nem `organizacao` (nenhuma das duas tabelas
// tem essa coluna) — vem de `auth.users` via `supabase.auth.getUser()`,
// mesmo padrão já usado em `lib/orcamento/salvarItem.ts` e outras Server
// Actions. Mostrado só-leitura em `/perfil` (trocar e-mail é fluxo de
// Supabase Auth próprio, fora de escopo desta task).
export interface OrganizacaoCarregada {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  /** `organizacao.logo_url` — desde a Task 4.8-4.9-back guarda o PATH do
   * objeto no bucket privado `organizacao-logos`, nunca uma signed URL
   * (mesma semântica de `linha_proposta.imagem_url`). Um valor legado que
   * ainda seja URL externa só é resolvido de volta pela Task 4.8-4.9 front. */
  logoUrl: string;
  unidade: "mm" | "cm";
  modoPrecificacaoPadrao: ModoPrecificacao;
  modoMontagemPadrao: ModoMontagem;
  espessuraSerraPadraoMm: number;
}

export interface PerfilCarregado {
  nome: string;
  telefone: string;
  email: string;
}

export interface PerfilOrganizacaoCarregados {
  perfil: PerfilCarregado;
  /** `null` só no cenário de borda descrito acima — a página mostra erro. */
  organizacao: OrganizacaoCarregada | null;
}

const PRECIFICACAO_FALLBACK: ModoPrecificacao = { modo: "multiplicador", fator: 2 };
const MONTAGEM_FALLBACK: ModoMontagem = { modo: "percentual_material", percentual: 0.1 };
const ESPESSURA_SERRA_PADRAO_MM_FALLBACK = 3;

/** `null` quando não há sessão — não deveria acontecer atrás do gate de
 * `middleware.ts`, mas a função permanece defensiva (mesmo padrão de outras
 * leituras server-side deste módulo). */
export async function carregarPerfilOrganizacao(): Promise<PerfilOrganizacaoCarregados | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: perfilRow } = await supabase
    .from("perfil")
    .select("nome, telefone, organizacao_id")
    .eq("id", user.id)
    .maybeSingle();

  const perfil: PerfilCarregado = {
    nome: (perfilRow?.nome as string | null) ?? "",
    telefone: (perfilRow?.telefone as string | null) ?? "",
    email: user.email ?? "",
  };

  const organizacaoId = (perfilRow?.organizacao_id as string | undefined) ?? null;
  let organizacao: OrganizacaoCarregada | null = null;

  if (organizacaoId) {
    const { data: orgRow } = await supabase
      .from("organizacao")
      .select(
        "id, nome, cnpj, endereco, telefone, logo_url, unidade, modo_precificacao_padrao, modo_montagem_padrao, espessura_serra_padrao_mm"
      )
      .eq("id", organizacaoId)
      .maybeSingle();

    if (orgRow) {
      organizacao = {
        id: orgRow.id as string,
        nome: (orgRow.nome as string | null) ?? "",
        cnpj: (orgRow.cnpj as string | null) ?? "",
        endereco: (orgRow.endereco as string | null) ?? "",
        telefone: (orgRow.telefone as string | null) ?? "",
        logoUrl: (orgRow.logo_url as string | null) ?? "",
        unidade: (orgRow.unidade as string | null) === "cm" ? "cm" : "mm",
        modoPrecificacaoPadrao: (orgRow.modo_precificacao_padrao as ModoPrecificacao | null) ?? PRECIFICACAO_FALLBACK,
        modoMontagemPadrao: (orgRow.modo_montagem_padrao as ModoMontagem | null) ?? MONTAGEM_FALLBACK,
        espessuraSerraPadraoMm:
          (orgRow.espessura_serra_padrao_mm as number | null) ?? ESPESSURA_SERRA_PADRAO_MM_FALLBACK,
      };
    }
  }

  return { perfil, organizacao };
}
