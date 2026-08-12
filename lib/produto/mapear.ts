import { CATALOGO_PADRAO, type AcabamentoMdf, type FerragemCatalogo, type Catalogo } from "@/lib/catalog";
import { PRECOS_REFERENCIA } from "@/lib/engine/prices";
import { nomeAmigavelFerragem, unidadePadraoFerragem, type ProdutoRow } from "./tipos";

// Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — mapeamento
// `produto` (Supabase, por organização) → `Catalogo` (`lib/catalog.ts`), o
// MESMO shape que `CATALOGO_PADRAO`/`carregarCatalogo` (localStorage) já
// produzem. Reaproveitamento deliberado: depois deste mapeamento,
// `catalogoParaPrecos` (já existente, INTOCADO) converte pro
// `PrecosReferencia` que o motor consome — um único ponto de tradução entre
// o schema novo (`produto`) e o pipeline de cálculo já existente, em vez de
// inventar um segundo shape/conversor.
//
// `montagemPorM2`/`freteFixo`: a migration de seed é explícita que estes DOIS
// campos NÃO são produto (viraram `organizacao.modo_montagem_padrao` /
// `orcamento.frete`, D-23/D-26) — aqui eles vêm sempre de
// `PRECOS_REFERENCIA` (constantes fixas, não editáveis por organização em
// `/catalogo`), nunca de uma linha de `produto`.
//
// Função PURA (sem I/O) de propósito — testável sem mockar Supabase; quem
// busca os dados é `lib/produto/buscar.ts` (consumo real, client-side) ou
// `lib/produto/listar.ts` (CRUD de `/catalogo`, server-side).
export function produtosParaCatalogo(produtos: ProdutoRow[]): Catalogo {
  const ativos = produtos.filter((p) => p.ativo);

  const mdf: AcabamentoMdf[] = ativos
    .filter((p) => p.tipo === "chapa")
    .map((p) => {
      const cor = String(p.especificacao.cor ?? "").trim();
      const espessura = Number(p.especificacao.espessura ?? 0);
      const texturaUrlBruta = p.especificacao.texturaUrl;
      const texturaUrl = typeof texturaUrlBruta === "string" && texturaUrlBruta.length > 0
        ? texturaUrlBruta
        : undefined;
      return { id: p.id, cor, espessura, precoChapa: p.preco, fornecedor: p.fornecedor ?? undefined, texturaUrl };
    })
    // Defesa: uma linha de `produto` tipo chapa sem cor/espessura válida
    // (não deveria existir vinda do formulário de `/catalogo`, que exige os
    // dois campos, mas pode acontecer com dado editado fora do app) não
    // entra no catálogo em vez de virar uma opção de material quebrada nos
    // dropdowns de material (`coresDisponiveis`/`espessurasDaCor`).
    .filter((m) => m.cor.length > 0 && m.espessura > 0);

  const ferragens: FerragemCatalogo[] = ativos
    .filter((p) => p.tipo === "ferragem")
    .map((p): FerragemCatalogo | null => {
      const codigo = String(p.especificacao.codigo ?? "").trim();
      return codigo
        ? {
            codigo,
            nome: p.nome.trim() || nomeAmigavelFerragem(codigo),
            unidade: String(p.especificacao.unidade ?? unidadePadraoFerragem(codigo)),
            preco: p.preco,
            fornecedor: p.fornecedor ?? undefined,
          }
        : null;
    })
    // Mesma defesa acima: `codigo` vazio não afeta cálculo nenhum (o motor
    // não sabe procurá-lo), não faz sentido entrar no catálogo consumido.
    .filter((f): f is FerragemCatalogo => f !== null);

  // Decisão de escopo do contrato ("se houver mais de um produto tipo fita
  // ativo, decisão sua qual usar"): o PRIMEIRO ativo por `criado_em` (o mais
  // antigo) — é o comportamento menos surpreendente para quem cadastrou um
  // único produto de fita no início e eventualmente cadastra um segundo
  // (o valor já em uso no motor não muda "silenciosamente" pro produto novo).
  const fitas = ativos
    .filter((p) => p.tipo === "fita")
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
  const fitaMetro = fitas[0]?.preco ?? PRECOS_REFERENCIA.fitaMetro;

  // Task 3.6 — mesmo critério de desempate de `fitaMetro` acima (primeiro
  // ativo por `criado_em`), mas SEM fallback: diferente de preço, não existe
  // tamanho de rolo padrão inventável — ausente/inválido no produto,
  // `tamanhoRoloFitaM` fica `undefined`.
  const tamanhoRoloBruto = fitas[0]?.especificacao.tamanhoRoloM;
  const tamanhoRoloFitaM =
    typeof tamanhoRoloBruto === "number" && tamanhoRoloBruto > 0 ? tamanhoRoloBruto : undefined;

  return {
    mdf,
    ferragens,
    fitaMetro,
    tamanhoRoloFitaM,
    montagemPorM2: PRECOS_REFERENCIA.montagemPorM2,
    freteFixo: PRECOS_REFERENCIA.freteFixo,
  };
}

/** `produtosParaCatalogo` com fallback pro catálogo padrão hardcoded quando
 * a organização não tem NENHUMA chapa nem ferragem ativa cadastrada (lista
 * vazia — não deveria acontecer em produção, a trigger de seed sempre
 * popula as duas categorias no signup, mas os harnesses `/dev/preview/*` não
 * têm Supabase real, e um erro de rede em `buscar.ts` também cai aqui). Sem
 * este fallback, um catálogo vazio quebraria os dropdowns de material do
 * Editor de Item e zeraria os custos de Corte & Material/Financeiro. */
export function produtosParaCatalogoComFallback(produtos: ProdutoRow[]): Catalogo {
  const catalogo = produtosParaCatalogo(produtos);
  if (catalogo.mdf.length === 0 && catalogo.ferragens.length === 0) {
    return CATALOGO_PADRAO;
  }
  return catalogo;
}
