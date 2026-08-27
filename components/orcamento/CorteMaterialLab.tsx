"use client";

import { useEffect, useMemo, useState } from "react";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EstadoVazioAba } from "@/components/ui/estado-vazio-aba";
import { todasAsPecas, montarLinhasInsumos, type LinhaInsumo } from "@/lib/insumos";
import { usePlanoDeCorte } from "@/lib/engine/box/usarPlanoDeCorte";
import { catalogoParaPrecos, type Catalogo } from "@/lib/catalog";
import { buscarCatalogoReal } from "@/lib/produto/buscar";
import { PRECOS_REFERENCIA } from "@/lib/engine/prices";
import { calcularEngineOrcamento } from "@/lib/ambiente/calcularEngineOrcamento";
import type { EstadoAmbiente } from "@/lib/ambiente/estado";
import {
  montarSnapshotListaMaterial,
  type ItemManualListaMaterial,
  type SnapshotListaMaterial,
} from "@/lib/lista-material/tipos";
import { baixarArquivo, gerarCsvListaMaterial, gerarTextoListaMaterial } from "@/lib/lista-material/exportar";
import type { ResultadoCongelarListaMaterial } from "@/lib/lista-material/congelar";
import { aplicarOverridesQuantidade } from "@/lib/lista-material/aplicarOverrides";
import type { OverrideQuantidade, ResultadoOverride } from "@/lib/lista-material/override";
import { formatarDataHora } from "@/lib/format";
import { useIrParaAba } from "./AbaAtivaContext";
import { SecaoPlanoDeCorte } from "./corte-material/SecaoPlanoDeCorte";
import { SecaoListaMaterial } from "./corte-material/SecaoListaMaterial";

// Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — componente
// PRESENTACIONAL da aba "Corte & Material" (mesmo espírito de
// `AmbientesLab.tsx`, Task 13.3d): recebe o `EstadoAmbiente` já carregado
// (a MESMA leitura que `AmbientesTabConectada` usa — `carregarEstadoAmbiente`
// chamado uma única vez em `app/(app)/orcamento/[id]/page.tsx`) e computa o
// plano de corte/lista de material do ORÇAMENTO INTEIRO a partir dele. Não
// sabe de Supabase — `onCongelar` é injetado por quem monta este componente
// (`CorteMaterialTabConectada`/`CorteMaterialTabMock`), mesmo padrão de
// `onSalvar` em `AmbientesLab`.
//
// Decisão de escopo registrada aqui (não só no relatório da task): esta aba
// é somaticamente DERIVADA do estado de Ambientes no momento em que a página
// foi carregada — ela NÃO refaz a leitura do Supabase nem escuta mudanças
// feitas na aba "Ambientes" depois do carregamento inicial (contrato: "não
// busque os dados de novo"). Se o usuário edita Ambientes e clica em "Salvar
// alterações", esta aba só reflete isso depois de um reload da página
// (F5/nova navegação para `/orcamento/[id]`) — mesma limitação que qualquer
// Server Component com dado buscado uma vez por request. Não é um bug desta
// task; é a arquitetura pedida pelo contrato.
export interface CorteMaterialLabProps {
  orcamentoId: string;
  estadoInicial: EstadoAmbiente;
  /** `orcamento.frete` (Task 11.2) — fonte única, só leitura aqui (contrato:
   * editar frete como parte do cálculo financeiro é escopo da Task 13.5). */
  frete: number | null;
  /** Metadado (`criado_em`) da última linha de `lista_material` deste
   * orçamento, já lido no servidor (`buscarUltimaListaMaterial`) — garante
   * que "recarregar a página não perde a intenção" mesmo sem estado de UI. */
  ultimaCongeladaEmInicial: string | null;
  /** `organizacao.espessuraSerraPadraoMm` (Task 4.16-back, já mesclada) — lido
   * no Server Component de `/orcamento/[id]/page.tsx` (`carregarPerfilOrganizacao`)
   * e passado como `kerf` real para `planoDeCorte` (Modelo-de-Dominio §8.2).
   * Editar esse valor é a Task 4.16-front (`/perfil`), fora de escopo aqui. */
  kerfMm: number;
  /** Overrides de quantidade ativos deste orçamento (Task 3.8 back,
   * `listarOverridesQuantidade`, lido uma vez no Server Component — mesmo
   * padrão de `ultimaCongeladaEmInicial`). */
  overridesQuantidadeIniciais: OverrideQuantidade[];
  /** `orcamento.congeladoEm` (já lido em `page.tsx` para a aba Proposta) —
   * desabilita a edição inline de quantidade quando o orçamento já está
   * congelado. */
  congeladoEm: string | null;
  onDefinirOverrideQuantidade: (itemChave: string, quantidade: number) => Promise<ResultadoOverride>;
  onRemoverOverrideQuantidade: (itemChave: string) => Promise<ResultadoOverride>;
  onCongelar: (snapshot: SnapshotListaMaterial) => Promise<ResultadoCongelarListaMaterial>;
}

function novoItemManualId(): string {
  return `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Erro de validação client-side antes de chamar a Server Action — mesma
 * regra de `definirOverrideQuantidade` (`lib/lista-material/override.ts`),
 * checada aqui só pra dar feedback imediato sem round-trip. */
export function validarQuantidadeEditada(valor: number): string | null {
  if (!Number.isFinite(valor) || valor < 0) {
    return "Informe uma quantidade válida (número maior ou igual a zero).";
  }
  return null;
}

/** Reducer puro do Map de overrides ativos em tela: `quantidade === null`
 * reverte (remove a chave), qualquer outro valor define/atualiza. Extraído
 * pra ser testável sem depender da Server Action real (mock só precisa
 * devolver `{ ok: true }`, este reducer decide o resto). */
export function aplicarResultadoOverride(
  atuais: Map<string, number>,
  itemChave: string,
  quantidade: number | null
): Map<string, number> {
  const novo = new Map(atuais);
  if (quantidade === null) novo.delete(itemChave);
  else novo.set(itemChave, quantidade);
  return novo;
}

export function CorteMaterialLab({
  orcamentoId,
  estadoInicial,
  frete,
  ultimaCongeladaEmInicial,
  kerfMm,
  overridesQuantidadeIniciais,
  congeladoEm,
  onDefinirOverrideQuantidade,
  onRemoverOverrideQuantidade,
  onCongelar,
}: CorteMaterialLabProps) {
  const irParaAba = useIrParaAba();

  // Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — catálogo REAL da
  // organização (Supabase, `produto`), em vez do antigo `carregarCatalogo()`
  // (localStorage). Mesmo padrão de efeito+estado; só passa de síncrono para
  // assíncrono. Enquanto `catalogo` ainda é `null` (primeira renderização,
  // antes do efeito resolver), os cálculos abaixo usam `PRECOS_REFERENCIA`
  // como fallback — o mesmo fallback que `buscarCatalogoReal` já aplicaria
  // internamente em caso de catálogo vazio/erro, então não há divergência
  // visível, só evita um "flash" de zero antes do fetch responder.
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  useEffect(() => {
    let cancelado = false;
    buscarCatalogoReal().then((c) => {
      if (!cancelado) setCatalogo(c);
    });
    return () => {
      cancelado = true;
    };
  }, []);
  const precos = catalogo ? catalogoParaPrecos(catalogo) : PRECOS_REFERENCIA;

  // Task 13.5 — extraído para `lib/ambiente/calcularEngineOrcamento.ts`
  // (mesmo `EngineOutput` agregado do orçamento inteiro que a aba Financeiro
  // também precisa; ver o comentário completo nesse arquivo).
  const resultadoEngine = useMemo(() => calcularEngineOrcamento(estadoInicial), [estadoInicial]);

  const pecas = useMemo(
    () => (resultadoEngine.ok ? todasAsPecas(resultadoEngine.engine) : []),
    [resultadoEngine]
  );
  const { grupos, calculando } = usePlanoDeCorte(pecas, kerfMm);

  // Task 3.2 — estado local, não persiste entre carregamentos (contrato:
  // "reseta a cada carregamento da página"). Off por padrão: nenhuma seta é
  // desenhada até o usuário ligar o toggle.
  const [mostrarVeios, setMostrarVeios] = useState(false);

  // `incluirServicos: false` — só o BOM de material (Chapas/Acabamento/
  // Ferragens). Montagem/frete de catálogo (`precos.montagemPorM2`/
  // `precos.freteFixo`) são defaults genéricos, não `orcamento.frete` real;
  // misturar os dois aqui seria inventar precificação nova (proibido pelo
  // contrato) — o frete real é mostrado à parte, só leitura, mais abaixo.
  const { linhas } = resultadoEngine.ok
    ? montarLinhasInsumos(resultadoEngine.engine, precos, { incluirServicos: false })
    : { linhas: [] as LinhaInsumo[] };

  // Task 3.8 (front) — overrides de quantidade ativos, mantidos em estado
  // local (Map por `item`) e mesclados sobre `linhas` pra exibição e pro
  // snapshot de congelamento (`aplicarOverridesQuantidade`, função pura).
  const [overrides, setOverrides] = useState<Map<string, number>>(
    () => new Map(overridesQuantidadeIniciais.map((o) => [o.itemChave, o.quantidade]))
  );
  const [editandoItem, setEditandoItem] = useState<string | null>(null);
  const [valorEdicao, setValorEdicao] = useState(0);
  const [erroEdicaoQuantidade, setErroEdicaoQuantidade] = useState<string | null>(null);

  const overridesAtivos = useMemo(
    () => Array.from(overrides, ([itemChave, quantidade]) => ({ itemChave, quantidade })),
    [overrides]
  );
  const linhasComOverride = useMemo(
    () => aplicarOverridesQuantidade(linhas, overridesAtivos),
    [linhas, overridesAtivos]
  );
  const subtotal = round2(linhasComOverride.reduce((s, l) => s + l.total, 0));

  function iniciarEdicaoQuantidade(linha: LinhaInsumo) {
    setErroEdicaoQuantidade(null);
    setEditandoItem(linha.item);
    setValorEdicao(overrides.get(linha.item) ?? linha.quantidadeBase);
  }

  function cancelarEdicaoQuantidade() {
    setEditandoItem(null);
  }

  async function confirmarEdicaoQuantidade(itemChave: string) {
    const erro = validarQuantidadeEditada(valorEdicao);
    if (erro) {
      setErroEdicaoQuantidade(erro);
      return;
    }
    const resultado = await onDefinirOverrideQuantidade(itemChave, valorEdicao);
    if (!resultado.ok) {
      setErroEdicaoQuantidade(resultado.erro ?? "Não foi possível salvar a quantidade editada.");
      return;
    }
    setOverrides((atuais) => aplicarResultadoOverride(atuais, itemChave, valorEdicao));
    setEditandoItem(null);
  }

  async function reverterEdicaoQuantidade(itemChave: string) {
    setErroEdicaoQuantidade(null);
    const resultado = await onRemoverOverrideQuantidade(itemChave);
    if (!resultado.ok) {
      setErroEdicaoQuantidade(resultado.erro ?? "Não foi possível remover a quantidade editada.");
      return;
    }
    setOverrides((atuais) => aplicarResultadoOverride(atuais, itemChave, null));
  }

  const [itensManuais, setItensManuais] = useState<ItemManualListaMaterial[]>([]);
  const [formDescricao, setFormDescricao] = useState("");
  const [formQuantidade, setFormQuantidade] = useState(1);
  const [formValorUnitario, setFormValorUnitario] = useState(0);

  function adicionarItemManual() {
    const descricao = formDescricao.trim();
    if (!descricao || formQuantidade <= 0) return;
    setItensManuais((atuais) => [
      ...atuais,
      { id: novoItemManualId(), descricao, quantidade: formQuantidade, valorUnitario: formValorUnitario },
    ]);
    setFormDescricao("");
    setFormQuantidade(1);
    setFormValorUnitario(0);
    setResultadoCongelar(null);
  }
  function removerItemManual(id: string) {
    setItensManuais((atuais) => atuais.filter((i) => i.id !== id));
    setResultadoCongelar(null);
  }

  const subtotalManual = itensManuais.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0);
  const totalGeral = subtotal + subtotalManual;

  const [congelando, setCongelando] = useState(false);
  const [resultadoCongelar, setResultadoCongelar] = useState<ResultadoCongelarListaMaterial | null>(null);
  const [ultimaCongeladaEm, setUltimaCongeladaEm] = useState(ultimaCongeladaEmInicial);

  function montarSnapshotAtual() {
    return montarSnapshotListaMaterial({
      orcamentoId,
      linhas: linhasComOverride,
      subtotalMaterial: subtotal,
      itensManuais,
      frete,
      grupos,
    });
  }

  async function handleCongelar() {
    setCongelando(true);
    setResultadoCongelar(null);
    const snapshot = montarSnapshotAtual();
    const resultado = await onCongelar(snapshot);
    setCongelando(false);
    setResultadoCongelar(resultado);
    if (resultado.ok) {
      setUltimaCongeladaEm(resultado.congeladoEm ?? new Date().toISOString());
    }
  }

  // D-08 — extração texto/CSV a partir do estado ATUAL em tela (decisão de
  // escopo: não exige congelar antes, ver comentário em
  // `lib/lista-material/tipos.ts`). Geração 100% client-side, sem endpoint
  // novo (contrato).
  function handleExportarTxt() {
    const snapshot = montarSnapshotAtual();
    baixarArquivo(
      `lista-material-orcamento-${orcamentoId.slice(0, 8)}.txt`,
      gerarTextoListaMaterial(snapshot),
      "text/plain;charset=utf-8"
    );
  }
  function handleExportarCsv() {
    const snapshot = montarSnapshotAtual();
    baixarArquivo(
      `lista-material-orcamento-${orcamentoId.slice(0, 8)}.csv`,
      gerarCsvListaMaterial(snapshot),
      "text/csv;charset=utf-8"
    );
  }

  // Estado "erro" (Design-System Seção 8): o cálculo do orçamento é feito a
  // partir de dados já salvos (Ambientes) — não há uma ação de "recalcular"
  // isolada e re-executável aqui (o botão "Tentar novamente" da spec só se
  // aplica quando a ação É re-executável), por isso o Alert não tem CTA:
  // a correção é voltar para a aba Ambientes.
  if (!resultadoEngine.ok) {
    return (
      <Alert variant="erro">
        <AlertDescription>
          Não foi possível calcular o plano de corte e a lista de material deste orçamento.
          Volte para a aba Ambientes e confira a configuração dos itens posicionados.
        </AlertDescription>
      </Alert>
    );
  }

  // Estado "vazio" (Design-System Seção 8): orçamento sem nenhuma peça ainda
  // — nem plano de corte nem lista de material fazem sentido nesse ponto.
  if (pecas.length === 0) {
    return (
      <EstadoVazioAba
        icone={Scissors}
        titulo="Nenhuma peça no plano de corte ainda"
        descricao="O plano de corte e a lista de material são calculados a partir dos itens posicionados na aba Ambientes. Adicione ao menos um item para ver o plano de corte aqui."
        acao={
          <Button variant="primary" onClick={() => irParaAba("ambientes")}>
            Ir para Ambientes
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <SecaoPlanoDeCorte
        grupos={grupos}
        calculando={calculando}
        mostrarVeios={mostrarVeios}
        setMostrarVeios={setMostrarVeios}
      />

      <SecaoListaMaterial
        linhasComOverride={linhasComOverride}
        overrides={overrides}
        editandoItem={editandoItem}
        valorEdicao={valorEdicao}
        setValorEdicao={setValorEdicao}
        erroEdicaoQuantidade={erroEdicaoQuantidade}
        congeladoEm={congeladoEm}
        iniciarEdicaoQuantidade={iniciarEdicaoQuantidade}
        cancelarEdicaoQuantidade={cancelarEdicaoQuantidade}
        confirmarEdicaoQuantidade={confirmarEdicaoQuantidade}
        reverterEdicaoQuantidade={reverterEdicaoQuantidade}
        itensManuais={itensManuais}
        removerItemManual={removerItemManual}
        subtotal={subtotal}
        subtotalManual={subtotalManual}
        totalGeral={totalGeral}
        frete={frete}
        formDescricao={formDescricao}
        setFormDescricao={setFormDescricao}
        formQuantidade={formQuantidade}
        setFormQuantidade={setFormQuantidade}
        formValorUnitario={formValorUnitario}
        setFormValorUnitario={setFormValorUnitario}
        adicionarItemManual={adicionarItemManual}
        handleExportarTxt={handleExportarTxt}
        handleExportarCsv={handleExportarCsv}
      />

      <section className="flex flex-col items-start gap-sm rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <Button variant="primary" onClick={handleCongelar} disabled={congelando}>
          {congelando ? "Congelando…" : "Congelar lista de material"}
        </Button>
        {ultimaCongeladaEm && (
          <p className="text-corpo-pequeno text-cinza-500">
            Última lista congelada em {formatarDataHora(ultimaCongeladaEm)}.
          </p>
        )}
        {resultadoCongelar && (
          <Alert variant={resultadoCongelar.ok ? "sucesso" : "erro"} className="w-full">
            <AlertDescription>
              {resultadoCongelar.ok
                ? "Lista de material congelada com sucesso."
                : (resultadoCongelar.erro ?? "Não foi possível congelar a lista de material.")}
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}
