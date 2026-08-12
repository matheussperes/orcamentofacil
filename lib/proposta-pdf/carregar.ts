import { createClient } from "@/lib/supabase/server";
import { BUCKET_LINHA_PROPOSTA_RENDERS } from "@/lib/linha-proposta/storage";
import { BUCKET_ORGANIZACAO_LOGOS } from "@/lib/organizacao/logo-storage";

// Task 13.6b (contrato .maestro/tmp/13.6b-contract.md) — leitura server-side
// única para `/proposta/[id]/pdf`: junta `orcamento` + `cliente` (emitente-
// -alvo... na verdade destinatário) + `organizacao` (emitente) numa única
// query (embedded select via FK, mesmo padrão de `lib/orcamento/buscar.ts`),
// e busca as Linhas de Proposta já CONGELADAS separadamente (esta rota só
// LÊ — a criação/congelamento de `valor_rateado` é responsabilidade
// exclusiva de `lib/linha-proposta/carregar.ts`/`PropostaLab.handleGerarProposta`,
// nunca duplicada aqui).
//
// Decisão de leitura de signed URL server-side (contrato pede pra
// documentar): `lib/linha-proposta/storage.ts::obterUrlAssinadaImagemLinha`
// usa o client BROWSER (`lib/supabase/client.ts`) porque é chamado de dentro
// de Client Components (thumbnail da aba Proposta). Esta rota é um Server
// Component puro — reescrevemos o mesmo `createSignedUrl` aqui usando o
// client SERVER (`lib/supabase/server.ts`, cookies da request), reaproveitando
// só a CONSTANTE do bucket (`BUCKET_LINHA_PROPOSTA_RENDERS`) de
// `lib/linha-proposta/storage.ts` — evita duplicar o nome do bucket como
// string solta, mas não importa a função cliente-browser aqui (misturar os
// dois clientes Supabase no mesmo módulo é proibido, ver comentário de
// `lib/supabase/server.ts`). Resolver a URL assinada no servidor, antes do
// primeiro paint, evita um round-trip client extra só para exibir a imagem
// de cada linha (o documento é estático assim que carrega, não há
// re-assinatura ao vivo).

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface OrganizacaoProposta {
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  /** `organizacao.logo_url` — desde a Task 4.8-4.9-back guarda o PATH do
   * objeto no bucket privado `organizacao-logos` (não mais URL de texto
   * livre), nunca uma signed URL persistida. Esta função (Task 4.10) já
   * resolve o path em signed URL antes do primeiro paint; `null` cobre
   * tanto a ausência de logo quanto falha ao resolver (path
   * inexistente/valor legado). A view cai para o asset estático
   * `/logo/logo-dark.png` quando `null` (mesmo par de logo usado na
   * sidebar, `components/shell/Sidebar.tsx`). */
  logoUrl: string | null;
}

export interface ClienteProposta {
  nome: string;
  telefone: string | null;
  endereco: string | null;
}

export interface LinhaPropostaPdf {
  id: string;
  titulo: string;
  descricao: string;
  /** `null` só no caso defensivo de uma linha nunca ter sido congelada
   * (fora do caminho normal — esta rota só é alcançada depois de
   * `handleGerarProposta` congelar TODAS as linhas). A view mostra "—" em
   * vez de inventar um valor. */
  valorRateado: number | null;
  /** URL assinada (1h) já resolvida no servidor, ou `null` quando a linha
   * ainda não tem render (`imagem_url` nulo no banco) ou a assinatura falhou. */
  imagemUrlAssinada: string | null;
}

export interface DadosPropostaPdf {
  orcamentoId: string;
  prazoEntrega: string | null;
  organizacao: OrganizacaoProposta;
  cliente: ClienteProposta;
  linhas: LinhaPropostaPdf[];
  /** Soma de `valorRateado` das linhas com valor conhecido — mesma soma que
   * já é `precoFinal` congelado na aba Proposta (D-25: nunca um custo
   * interno separado aparece aqui, só o total). */
  total: number;
}

type OrganizacaoRow = {
  nome: string;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
  logo_url: string | null;
};
type ClienteRow = { nome: string; telefone: string | null; endereco: string | null };
type OrcamentoRow = {
  id: string;
  prazo_entrega: string | null;
  cliente: ClienteRow | ClienteRow[] | null;
  organizacao: OrganizacaoRow | OrganizacaoRow[] | null;
};

function primeiroOuNulo<T>(valor: T | T[] | null): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

async function assinarUrlImagem(supabase: SupabaseServerClient, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET_LINHA_PROPOSTA_RENDERS).createSignedUrl(path, 3600);
  if (error || !data) {
    console.error("[proposta-pdf] falha ao gerar URL assinada da imagem de linha:", error?.message);
    return null;
  }
  return data.signedUrl;
}

async function assinarUrlLogo(supabase: SupabaseServerClient, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET_ORGANIZACAO_LOGOS).createSignedUrl(path, 3600);
  if (error || !data) {
    console.error("[proposta-pdf] falha ao gerar URL assinada da logo da organizacao:", error?.message);
    return null;
  }
  return data.signedUrl;
}

/**
 * Busca todos os dados de `/proposta/[id]/pdf` num único ponto de I/O.
 * Devolve `null` quando o orçamento não existe, não pertence à organização
 * do usuário atual (RLS), ou (defensivo) não resolve cliente/organizacao —
 * a página trata `null` como 404, mesmo espírito de `buscarOrcamentoPorId`.
 *
 * Quando o orçamento existe mas ainda não tem NENHUMA Linha de Proposta
 * (usuário chegou aqui por URL direta sem passar pela aba Proposta),
 * devolve `linhas: []` — não é `null`, é o estado vazio real da tela (a
 * página decide como renderizar isso, esta função só lê).
 */
export async function carregarDadosPropostaPdf(orcamentoId: string): Promise<DadosPropostaPdf | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("orcamento")
    .select("id, prazo_entrega, cliente(nome, telefone, endereco), organizacao(nome, cnpj, endereco, telefone, logo_url)")
    .eq("id", orcamentoId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as unknown as OrcamentoRow;
  const clienteRow = primeiroOuNulo(row.cliente);
  const organizacaoRow = primeiroOuNulo(row.organizacao);
  if (!clienteRow || !organizacaoRow) {
    // Defensivo: `orcamento.cliente_id`/`organizacao_id` são NOT NULL no
    // schema — nunca deveria acontecer em produção.
    return null;
  }

  const { data: linhasRows, error: erroLinhas } = await supabase
    .from("linha_proposta")
    .select("id, titulo, descricao, valor_rateado, imagem_url")
    .eq("orcamento_id", orcamentoId)
    .order("criado_em", { ascending: true });

  if (erroLinhas) {
    console.error("[proposta-pdf] falha ao carregar linhas de proposta:", erroLinhas.message);
  }

  const linhasBrutas = linhasRows ?? [];
  const linhas: LinhaPropostaPdf[] = await Promise.all(
    linhasBrutas.map(async (linhaRow) => {
      const imagemUrlAssinada = linhaRow.imagem_url
        ? await assinarUrlImagem(supabase, linhaRow.imagem_url as string)
        : null;
      return {
        id: linhaRow.id as string,
        titulo: linhaRow.titulo as string,
        descricao: (linhaRow.descricao as string | null) ?? "",
        valorRateado: (linhaRow.valor_rateado as number | null) ?? null,
        imagemUrlAssinada,
      };
    })
  );

  const total = linhas.reduce((soma, l) => soma + (l.valorRateado ?? 0), 0);

  const logoUrl = organizacaoRow.logo_url ? await assinarUrlLogo(supabase, organizacaoRow.logo_url) : null;

  return {
    orcamentoId,
    prazoEntrega: row.prazo_entrega,
    organizacao: {
      nome: organizacaoRow.nome,
      cnpj: organizacaoRow.cnpj,
      endereco: organizacaoRow.endereco,
      telefone: organizacaoRow.telefone,
      logoUrl,
    },
    cliente: {
      nome: clienteRow.nome,
      telefone: clienteRow.telefone,
      endereco: clienteRow.endereco,
    },
    linhas,
    total,
  };
}
