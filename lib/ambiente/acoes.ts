"use server";

import { createClient } from "@/lib/supabase/server";
import { idDoItem, type ModuloOrcamento } from "@/lib/orcamento";
import { modulosDeJson } from "./mapear";
import type { AlturasFaixas, ItemPosicionado } from "@/lib/engine/parede/types";

// Task 0.1-0.3 (contrato .maestro/tmp — "Ambiente/Parede como entidade real
// N×N") — Server Actions de CRUD para N ambientes por orçamento e N paredes
// por ambiente (Modelo-de-Dominio.md Seção 3.2, [V2.1]). O schema já suportava
// isso (supabase/migrations/20260727090400_ambiente_parede.sql); esta task só
// acrescenta `ordem`/`nome`/`alturas_override` (migration
// 20260801100000_ambiente_parede_ordem_nome_alturas.sql) e as ações abaixo.
//
// Deliberadamente PARALELAS a `salvarEstadoAmbiente`/`carregarEstadoAmbiente`
// (lib/ambiente/salvar.ts, carregar.ts) — não as substitui. Aquelas continuam
// lendo/escrevendo só a primeira linha de `ambiente`/`parede` por orçamento;
// consumir estas ações para múltiplos ambientes/paredes de verdade é escopo
// do Lote 2 (Tasks 2.3-2.6).
//
// Mesmo padrão de autenticação/organização de `lib/orcamento/criar.ts` e
// `lib/ambiente/salvar.ts`: nunca confia em organizacao_id vindo do client —
// resolve via `perfil` do usuário autenticado, e a RLS `with check`/`using`
// de cada tabela confirma de novo no banco.

type SupabaseServidor = Awaited<ReturnType<typeof createClient>>;

// Achado 1 (Security-Decline-Payload.md, tentativa 1): `nome` vai para coluna
// `text` sem teto — um único limite aplicado nos 4 pontos que gravam nome
// (ambiente/parede) fecha a validação de tamanho.
const NOME_MAX_LENGTH = 120;

function nomeMuitoLongo(nomeLimpo: string): Resultado | null {
  if (nomeLimpo.length > NOME_MAX_LENGTH) {
    return { ok: false, erro: `O nome não pode passar de ${NOME_MAX_LENGTH} caracteres.` };
  }
  return null;
}

// Achado 1: `alturasOverride` chega como `Partial<AlturasFaixas>` só em
// tipo — TypeScript não protege em runtime (Server Action = endpoint HTTP
// público). Whitelist de chave + validação de valor antes de gravar em
// `parede.alturas_override` (jsonb sem shape formal no banco).
const CHAVES_ALTURAS_FAIXAS = new Set<keyof AlturasFaixas>([
  "alturaRodape",
  "alturaBancada",
  "alturaInstalacaoAereo",
  "peDireito",
]);
const ALTURA_MAX_MM = 6000; // teto de faixa residencial — cobre pé-direito duplo, barra blob arbitrário

export function sanearAlturasOverride(
  entrada: Partial<AlturasFaixas>
): { ok: true; valor: Partial<AlturasFaixas> } | { ok: false; erro: string } {
  const valor: Partial<AlturasFaixas> = {};
  for (const chave of Object.keys(entrada) as (keyof AlturasFaixas)[]) {
    if (!CHAVES_ALTURAS_FAIXAS.has(chave)) continue; // descarta chave fora do shape
    const v = entrada[chave];
    if (typeof v !== "number" || !Number.isFinite(v) || !(v > 0) || v > ALTURA_MAX_MM) {
      return { ok: false, erro: "Altura inválida em alturas_override." };
    }
    valor[chave] = v;
  }
  return { ok: true, valor };
}

interface Resultado {
  ok: boolean;
  erro?: string;
}

interface ResultadoComId extends Resultado {
  id?: string;
}

async function organizacaoDoUsuario(
  supabase: SupabaseServidor
): Promise<{ organizacaoId: string | null; erro?: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { organizacaoId: null, erro: "Sua sessão expirou. Faça login novamente." };
  }

  const { data: perfil, error: erroPerfil } = await supabase
    .from("perfil")
    .select("organizacao_id")
    .eq("id", user.id)
    .maybeSingle();

  if (erroPerfil || !perfil) {
    console.error("[ambiente/acoes] falha ao buscar organizacao_id do perfil:", erroPerfil?.message);
    return { organizacaoId: null, erro: "Não foi possível identificar sua organização. Tente novamente." };
  }

  return { organizacaoId: perfil.organizacao_id as string };
}

// ---------------------------------------------------------------------------
// Cascata órfã (ponto de atenção real, sem FK que garanta): excluir um
// ambiente ou uma parede pode deixar `itemId` de `orcamento.itens`
// (ModuloOrcamento[]) sem nenhum `ItemPosicionado` que o referencie em
// nenhuma parede restante do orçamento. Função PURA (sem I/O), testável sem
// mockar o client do Supabase — mesmo espírito de `lib/ambiente/mapear.ts`
// (o projeto não tem infraestrutura de mock do client Supabase ainda).
// ---------------------------------------------------------------------------
export function itensSemOrfaos(
  modulos: ModuloOrcamento[],
  itensPorParedeRestante: ItemPosicionado[][]
): ModuloOrcamento[] {
  const referenciados = new Set(itensPorParedeRestante.flat().map((item) => item.itemId));
  return modulos.filter((modulo) => referenciados.has(idDoItem(modulo)));
}

/** Recalcula e grava `orcamento.itens` sem os `itemId` que não são mais
 * referenciados por nenhuma parede restante do orçamento. Chamada pelo mesmo
 * ponto tanto de `excluirAmbiente` quanto de `excluirParede`, DEPOIS da
 * exclusão já ter acontecido no banco. */
async function removerItensOrfaosDoOrcamento(
  supabase: SupabaseServidor,
  orcamentoId: string
): Promise<Resultado> {
  const { data: ambientes, error: erroAmbientes } = await supabase
    .from("ambiente")
    .select("id")
    .eq("orcamento_id", orcamentoId);

  if (erroAmbientes) {
    console.error("[ambiente/acoes] falha ao listar ambientes restantes:", erroAmbientes.message);
    return { ok: false, erro: "Não foi possível verificar os ambientes restantes." };
  }

  const ambienteIds = (ambientes ?? []).map((a) => a.id as string);

  let itensPorParedeRestante: ItemPosicionado[][] = [];
  if (ambienteIds.length > 0) {
    const { data: paredes, error: erroParedes } = await supabase
      .from("parede")
      .select("itens")
      .in("ambiente_id", ambienteIds);

    if (erroParedes) {
      console.error("[ambiente/acoes] falha ao listar paredes restantes:", erroParedes.message);
      return { ok: false, erro: "Não foi possível verificar as paredes restantes." };
    }

    itensPorParedeRestante = (paredes ?? []).map(
      (p) => (p.itens as ItemPosicionado[] | null) ?? []
    );
  }

  const { data: orcamentoRow, error: erroOrcamento } = await supabase
    .from("orcamento")
    .select("itens")
    .eq("id", orcamentoId)
    .maybeSingle();

  if (erroOrcamento || !orcamentoRow) {
    console.error("[ambiente/acoes] falha ao carregar itens do orçamento:", erroOrcamento?.message);
    return { ok: false, erro: "Não foi possível carregar os itens do orçamento." };
  }

  const modulos = modulosDeJson(orcamentoRow.itens ?? null);
  const semOrfaos = itensSemOrfaos(modulos, itensPorParedeRestante);

  if (semOrfaos.length === modulos.length) {
    return { ok: true }; // nada órfão — evita um UPDATE desnecessário
  }

  const { error: erroUpdate } = await supabase
    .from("orcamento")
    .update({ itens: semOrfaos })
    .eq("id", orcamentoId);

  if (erroUpdate) {
    console.error("[ambiente/acoes] falha ao remover itens órfãos:", erroUpdate.message);
    return { ok: false, erro: "Não foi possível atualizar os itens do orçamento." };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Ambiente
// ---------------------------------------------------------------------------

export async function criarAmbiente(orcamentoId: string, nome: string): Promise<ResultadoComId> {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) {
    return { ok: false, erro: "Informe o nome do ambiente." };
  }
  const erroTamanho = nomeMuitoLongo(nomeLimpo);
  if (erroTamanho) return erroTamanho;

  const supabase = await createClient();
  const { organizacaoId, erro } = await organizacaoDoUsuario(supabase);
  if (!organizacaoId) return { ok: false, erro };

  // Achado 2 (Security-Decline-Payload.md, tentativa 1): `orcamentoId` vem do
  // client — confirma posse antes de pendurar um `ambiente` nele, mesmo
  // padrão que `criarParede` já usa para `ambienteId` (abaixo).
  const { data: orcamento, error: erroOrcamento } = await supabase
    .from("orcamento")
    .select("id")
    .eq("id", orcamentoId)
    .eq("organizacao_id", organizacaoId)
    .maybeSingle();

  if (erroOrcamento || !orcamento) {
    console.error("[ambiente/acoes] falha ao localizar orçamento do novo ambiente:", erroOrcamento?.message);
    return { ok: false, erro: "Este orçamento não existe mais." };
  }

  const { data: ultimo, error: erroUltimo } = await supabase
    .from("ambiente")
    .select("ordem")
    .eq("orcamento_id", orcamentoId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroUltimo) {
    console.error("[ambiente/acoes] falha ao calcular ordem do novo ambiente:", erroUltimo.message);
    return { ok: false, erro: "Não foi possível criar o ambiente." };
  }

  const ordem = ((ultimo?.ordem as number | undefined) ?? -1) + 1;

  const { data: novo, error: erroCriar } = await supabase
    .from("ambiente")
    .insert({ organizacao_id: organizacaoId, orcamento_id: orcamentoId, nome: nomeLimpo, ordem })
    .select("id")
    .single();

  if (erroCriar || !novo) {
    console.error("[ambiente/acoes] falha ao criar ambiente:", erroCriar?.message);
    return { ok: false, erro: "Não foi possível criar o ambiente." };
  }

  return { ok: true, id: novo.id as string };
}

export async function renomearAmbiente(ambienteId: string, nome: string): Promise<Resultado> {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) {
    return { ok: false, erro: "Informe o nome do ambiente." };
  }
  const erroTamanho = nomeMuitoLongo(nomeLimpo);
  if (erroTamanho) return erroTamanho;

  const supabase = await createClient();
  const { organizacaoId, erro } = await organizacaoDoUsuario(supabase);
  if (!organizacaoId) return { ok: false, erro };

  const { data, error: erroUpdate } = await supabase
    .from("ambiente")
    .update({ nome: nomeLimpo })
    .eq("id", ambienteId)
    .eq("organizacao_id", organizacaoId)
    .select("id")
    .maybeSingle();

  if (erroUpdate) {
    console.error("[ambiente/acoes] falha ao renomear ambiente:", erroUpdate.message);
    return { ok: false, erro: "Não foi possível renomear o ambiente." };
  }
  if (!data) {
    return { ok: false, erro: "Este ambiente não existe mais." };
  }

  return { ok: true };
}

export async function reordenarAmbientes(
  orcamentoId: string,
  idsNaNovaOrdem: string[]
): Promise<Resultado> {
  const supabase = await createClient();
  const { organizacaoId, erro } = await organizacaoDoUsuario(supabase);
  if (!organizacaoId) return { ok: false, erro };

  // Achado 2 (correção QA, tentativa 1): a lista recebida precisa ser
  // exatamente o conjunto de ambientes reais do orçamento — senão um
  // ambiente omitido fica com a `ordem` antiga, colidindo com a de outro
  // que foi realocado para essa mesma posição. Valida ANTES de aplicar
  // qualquer update.
  const { data: ambientesReais, error: erroAmbientesReais } = await supabase
    .from("ambiente")
    .select("id")
    .eq("orcamento_id", orcamentoId)
    .eq("organizacao_id", organizacaoId);

  if (erroAmbientesReais) {
    console.error("[ambiente/acoes] falha ao validar ambientes do orçamento:", erroAmbientesReais.message);
    return { ok: false, erro: "Não foi possível salvar a nova ordem dos ambientes." };
  }

  const idsReais = new Set((ambientesReais ?? []).map((a) => a.id as string));
  const idsRecebidosUnicos = new Set(idsNaNovaOrdem);
  const listaBate =
    idsNaNovaOrdem.length === idsRecebidosUnicos.size &&
    idsRecebidosUnicos.size === idsReais.size &&
    idsNaNovaOrdem.every((id) => idsReais.has(id));

  if (!listaBate) {
    return { ok: false, erro: "A lista de ambientes está incompleta ou desatualizada." };
  }

  for (let ordem = 0; ordem < idsNaNovaOrdem.length; ordem++) {
    const { error: erroUpdate } = await supabase
      .from("ambiente")
      .update({ ordem })
      .eq("id", idsNaNovaOrdem[ordem])
      .eq("orcamento_id", orcamentoId)
      .eq("organizacao_id", organizacaoId);

    if (erroUpdate) {
      console.error("[ambiente/acoes] falha ao reordenar ambientes:", erroUpdate.message);
      return { ok: false, erro: "Não foi possível salvar a nova ordem dos ambientes." };
    }
  }

  return { ok: true };
}

export async function excluirAmbiente(ambienteId: string): Promise<Resultado> {
  const supabase = await createClient();
  const { organizacaoId, erro } = await organizacaoDoUsuario(supabase);
  if (!organizacaoId) return { ok: false, erro };

  const { data: ambiente, error: erroBuscar } = await supabase
    .from("ambiente")
    .select("orcamento_id")
    .eq("id", ambienteId)
    .eq("organizacao_id", organizacaoId)
    .maybeSingle();

  if (erroBuscar || !ambiente) {
    console.error("[ambiente/acoes] falha ao localizar ambiente para exclusão:", erroBuscar?.message);
    return { ok: false, erro: "Este ambiente não existe mais." };
  }

  const orcamentoId = ambiente.orcamento_id as string;

  const { error: erroDelete } = await supabase
    .from("ambiente")
    .delete()
    .eq("id", ambienteId)
    .eq("organizacao_id", organizacaoId);

  if (erroDelete) {
    console.error("[ambiente/acoes] falha ao excluir ambiente:", erroDelete.message);
    return { ok: false, erro: "Não foi possível excluir o ambiente." };
  }

  // FK `on delete cascade` já apagou as paredes daquele ambiente. Os itemId
  // que só existiam nelas ficam órfãos em `orcamento.itens` — sem isso, o
  // custo continuaria sendo contado no plano de corte.
  return removerItensOrfaosDoOrcamento(supabase, orcamentoId);
}

// ---------------------------------------------------------------------------
// Parede
// ---------------------------------------------------------------------------

export async function criarParede(
  ambienteId: string,
  nome: string,
  largura: number,
  altura: number
): Promise<ResultadoComId> {
  const nomeLimpo = nome.trim();
  if (!nomeLimpo) {
    return { ok: false, erro: "Informe o nome da parede." };
  }
  const erroTamanho = nomeMuitoLongo(nomeLimpo);
  if (erroTamanho) return erroTamanho;
  if (!(largura > 0) || !(altura > 0)) {
    return { ok: false, erro: "Largura e altura da parede devem ser maiores que zero." };
  }

  const supabase = await createClient();
  const { organizacaoId, erro } = await organizacaoDoUsuario(supabase);
  if (!organizacaoId) return { ok: false, erro };

  const { data: ambiente, error: erroAmbiente } = await supabase
    .from("ambiente")
    .select("id")
    .eq("id", ambienteId)
    .eq("organizacao_id", organizacaoId)
    .maybeSingle();

  if (erroAmbiente || !ambiente) {
    console.error("[ambiente/acoes] falha ao localizar ambiente da nova parede:", erroAmbiente?.message);
    return { ok: false, erro: "Este ambiente não existe mais." };
  }

  const { data: ultima, error: erroUltima } = await supabase
    .from("parede")
    .select("ordem")
    .eq("ambiente_id", ambienteId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroUltima) {
    console.error("[ambiente/acoes] falha ao calcular ordem da nova parede:", erroUltima.message);
    return { ok: false, erro: "Não foi possível criar a parede." };
  }

  const ordem = ((ultima?.ordem as number | undefined) ?? -1) + 1;

  const { data: nova, error: erroCriar } = await supabase
    .from("parede")
    .insert({
      organizacao_id: organizacaoId,
      ambiente_id: ambienteId,
      nome: nomeLimpo,
      ordem,
      largura,
      altura,
    })
    .select("id")
    .single();

  if (erroCriar || !nova) {
    console.error("[ambiente/acoes] falha ao criar parede:", erroCriar?.message);
    return { ok: false, erro: "Não foi possível criar a parede." };
  }

  return { ok: true, id: nova.id as string };
}

export interface CamposParede {
  nome?: string;
  largura?: number;
  altura?: number;
  /** Q-1 (Modelo 3.2.1): override CAMPO A CAMPO — chave ausente = herdado do
   * perfil da organização. Nunca gravar aqui uma cópia integral do perfil. */
  alturasOverride?: Partial<AlturasFaixas>;
}

export async function atualizarParede(paredeId: string, campos: CamposParede): Promise<Resultado> {
  const atualizacao: Record<string, unknown> = {};

  if (campos.nome !== undefined) {
    const nomeLimpo = campos.nome.trim();
    if (!nomeLimpo) {
      return { ok: false, erro: "Informe o nome da parede." };
    }
    const erroTamanho = nomeMuitoLongo(nomeLimpo);
    if (erroTamanho) return erroTamanho;
    atualizacao.nome = nomeLimpo;
  }
  if (campos.largura !== undefined) {
    if (!(campos.largura > 0)) {
      return { ok: false, erro: "A largura da parede deve ser maior que zero." };
    }
    atualizacao.largura = campos.largura;
  }
  if (campos.altura !== undefined) {
    if (!(campos.altura > 0)) {
      return { ok: false, erro: "A altura da parede deve ser maior que zero." };
    }
    atualizacao.altura = campos.altura;
  }
  if (campos.alturasOverride !== undefined) {
    const saneado = sanearAlturasOverride(campos.alturasOverride);
    if (!saneado.ok) return { ok: false, erro: saneado.erro };
    atualizacao.alturas_override = saneado.valor;
  }

  if (Object.keys(atualizacao).length === 0) {
    return { ok: true };
  }

  const supabase = await createClient();
  const { organizacaoId, erro } = await organizacaoDoUsuario(supabase);
  if (!organizacaoId) return { ok: false, erro };

  const { data, error: erroUpdate } = await supabase
    .from("parede")
    .update(atualizacao)
    .eq("id", paredeId)
    .eq("organizacao_id", organizacaoId)
    .select("id")
    .maybeSingle();

  if (erroUpdate) {
    console.error("[ambiente/acoes] falha ao atualizar parede:", erroUpdate.message);
    return { ok: false, erro: "Não foi possível salvar a parede." };
  }
  if (!data) {
    return { ok: false, erro: "Esta parede não existe mais." };
  }

  return { ok: true };
}

// Task 2.3-2.6 (frontend) — mirror exato de `reordenarAmbientes`, um nível
// abaixo: faltava uma ação de reordenar PAREDES dentro de um ambiente (as 7
// Server Actions da Task 0.1-0.3 cobriam criar/renomear/excluir parede, mas
// não reordenar). Mesma validação "lista recebida precisa bater com as
// paredes reais do ambiente" da 0.1-0.3 (Achado 2 do QA em reordenarAmbientes).
export async function reordenarParedes(
  ambienteId: string,
  idsNaNovaOrdem: string[]
): Promise<Resultado> {
  const supabase = await createClient();
  const { organizacaoId, erro } = await organizacaoDoUsuario(supabase);
  if (!organizacaoId) return { ok: false, erro };

  const { data: paredesReais, error: erroParedesReais } = await supabase
    .from("parede")
    .select("id")
    .eq("ambiente_id", ambienteId)
    .eq("organizacao_id", organizacaoId);

  if (erroParedesReais) {
    console.error("[ambiente/acoes] falha ao validar paredes do ambiente:", erroParedesReais.message);
    return { ok: false, erro: "Não foi possível salvar a nova ordem das paredes." };
  }

  const idsReais = new Set((paredesReais ?? []).map((p) => p.id as string));
  const idsRecebidosUnicos = new Set(idsNaNovaOrdem);
  const listaBate =
    idsNaNovaOrdem.length === idsRecebidosUnicos.size &&
    idsRecebidosUnicos.size === idsReais.size &&
    idsNaNovaOrdem.every((id) => idsReais.has(id));

  if (!listaBate) {
    return { ok: false, erro: "A lista de paredes está incompleta ou desatualizada." };
  }

  for (let ordem = 0; ordem < idsNaNovaOrdem.length; ordem++) {
    const { error: erroUpdate } = await supabase
      .from("parede")
      .update({ ordem })
      .eq("id", idsNaNovaOrdem[ordem])
      .eq("ambiente_id", ambienteId)
      .eq("organizacao_id", organizacaoId);

    if (erroUpdate) {
      console.error("[ambiente/acoes] falha ao reordenar paredes:", erroUpdate.message);
      return { ok: false, erro: "Não foi possível salvar a nova ordem das paredes." };
    }
  }

  return { ok: true };
}

export async function excluirParede(paredeId: string): Promise<Resultado> {
  const supabase = await createClient();
  const { organizacaoId, erro } = await organizacaoDoUsuario(supabase);
  if (!organizacaoId) return { ok: false, erro };

  const { data: parede, error: erroBuscar } = await supabase
    .from("parede")
    .select("ambiente_id")
    .eq("id", paredeId)
    .eq("organizacao_id", organizacaoId)
    .maybeSingle();

  if (erroBuscar || !parede) {
    console.error("[ambiente/acoes] falha ao localizar parede para exclusão:", erroBuscar?.message);
    return { ok: false, erro: "Esta parede não existe mais." };
  }

  const { data: ambiente, error: erroAmbiente } = await supabase
    .from("ambiente")
    .select("orcamento_id")
    .eq("id", parede.ambiente_id as string)
    .eq("organizacao_id", organizacaoId)
    .maybeSingle();

  if (erroAmbiente || !ambiente) {
    console.error("[ambiente/acoes] falha ao localizar orçamento da parede:", erroAmbiente?.message);
    return { ok: false, erro: "Não foi possível excluir a parede." };
  }

  const orcamentoId = ambiente.orcamento_id as string;

  const { error: erroDelete } = await supabase
    .from("parede")
    .delete()
    .eq("id", paredeId)
    .eq("organizacao_id", organizacaoId);

  if (erroDelete) {
    console.error("[ambiente/acoes] falha ao excluir parede:", erroDelete.message);
    return { ok: false, erro: "Não foi possível excluir a parede." };
  }

  // Mesmo problema de excluirAmbiente, um nível abaixo: os itemId que só
  // existiam nesta parede ficam órfãos em `orcamento.itens`.
  return removerItensOrfaosDoOrcamento(supabase, orcamentoId);
}
