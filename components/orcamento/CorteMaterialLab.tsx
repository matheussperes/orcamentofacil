"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Scissors, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlanoCorteCanvas } from "@/app/components/PlanoCorteCanvas";
import { detectarConjuntos, aplicarOverrides } from "@/lib/engine/conjunto";
import type { ResolvedorItens } from "@/lib/engine/parede";
import { calcularOrcamentoMisto, idDoItem, type ElementoContinuoResolvido } from "@/lib/orcamento";
import { MATERIAIS_PADRAO, PARAMETROS_FABRICA_PADRAO } from "@/lib/engine/defaults";
import { todasAsPecas, montarLinhasInsumos } from "@/lib/insumos";
import { planoDeCorte } from "@/lib/engine/box/cutting";
import { carregarCatalogo, catalogoParaPrecos, type Catalogo } from "@/lib/catalog";
import { PRECOS_REFERENCIA } from "@/lib/engine/prices";
import { resolverAlvoElemento } from "@/lib/ambiente/resolverAlvo";
import type { EstadoAmbiente } from "@/lib/ambiente/estado";
import {
  montarSnapshotListaMaterial,
  type ItemManualListaMaterial,
  type SnapshotListaMaterial,
} from "@/lib/lista-material/tipos";
import { baixarArquivo, gerarCsvListaMaterial, gerarTextoListaMaterial } from "@/lib/lista-material/exportar";
import type { ResultadoCongelarListaMaterial } from "@/lib/lista-material/congelar";
import { formatarDataHora, formatarMoeda } from "@/lib/format";
import { useIrParaAba } from "./AbaAtivaContext";

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
  onCongelar: (snapshot: SnapshotListaMaterial) => Promise<ResultadoCongelarListaMaterial>;
}

function novoItemManualId(): string {
  return `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Design-System.md Seção 9.4 — limiares de aproveitamento (decisão do
// Product Designer, não estavam explícitos no mockup): >=70% sucesso,
// 40–70% accent, <40% erro.
function corAproveitamento(aproveitamento: number): "sucesso" | "accent" | "erro" {
  if (aproveitamento >= 0.7) return "sucesso";
  if (aproveitamento >= 0.4) return "accent";
  return "erro";
}

export function CorteMaterialLab({
  orcamentoId,
  estadoInicial,
  frete,
  ultimaCongeladaEmInicial,
  onCongelar,
}: CorteMaterialLabProps) {
  const irParaAba = useIrParaAba();

  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  useEffect(() => {
    setCatalogo(carregarCatalogo());
  }, []);
  const precos = catalogo ? catalogoParaPrecos(catalogo) : PRECOS_REFERENCIA;

  // Task 13.4 — mesmo pipeline que `AmbientesLab.tsx` já usa (Task 13.2b/c):
  // resolvedor de itens -> Conjuntos (automáticos + overrides de junção) ->
  // Elementos Contínuos resolvidos -> `calcularOrcamentoMisto`. A diferença é
  // o escopo: aqui entram TODOS os `modulos`/`elementosContinuos` do
  // orçamento, não só os da seleção atual (esta aba não tem seleção — é uma
  // visão agregada, somente leitura, do orçamento inteiro).
  const resultadoEngine = useMemo(() => {
    try {
      const resolvedor: ResolvedorItens = new Map(estadoInicial.modulos.map((m) => [idDoItem(m), m]));
      const conjuntosAutomaticos = detectarConjuntos(estadoInicial.parede, estadoInicial.alturas, resolvedor);
      const conjuntosFinais = aplicarOverrides(
        conjuntosAutomaticos,
        estadoInicial.parede.itens,
        estadoInicial.overrides
      );
      const elementosContinuosResolvidos: ElementoContinuoResolvido[] = estadoInicial.elementosContinuos
        .map((elemento) => {
          const alvo = resolverAlvoElemento(elemento, resolvedor, conjuntosFinais);
          return alvo ? { elemento, alvo } : null;
        })
        .filter((v): v is ElementoContinuoResolvido => v !== null);

      const engine = calcularOrcamentoMisto({
        ambiente: { tipo: "ambiente", materiais: MATERIAIS_PADRAO },
        parametros: PARAMETROS_FABRICA_PADRAO,
        itens: estadoInicial.modulos,
        elementosContinuos: elementosContinuosResolvidos,
      });
      return { ok: true as const, engine };
    } catch (erro) {
      console.error("[corte-material] falha ao calcular o orçamento:", erro);
      return { ok: false as const };
    }
  }, [estadoInicial]);

  const pecas = useMemo(
    () => (resultadoEngine.ok ? todasAsPecas(resultadoEngine.engine) : []),
    [resultadoEngine]
  );
  const grupos = useMemo(() => planoDeCorte(pecas), [pecas]);

  // `incluirServicos: false` — só o BOM de material (Chapas/Acabamento/
  // Ferragens). Montagem/frete de catálogo (`precos.montagemPorM2`/
  // `precos.freteFixo`) são defaults genéricos, não `orcamento.frete` real;
  // misturar os dois aqui seria inventar precificação nova (proibido pelo
  // contrato) — o frete real é mostrado à parte, só leitura, mais abaixo.
  const { linhas, subtotal } = resultadoEngine.ok
    ? montarLinhasInsumos(resultadoEngine.engine, precos, { incluirServicos: false })
    : { linhas: [], subtotal: 0 };

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
      linhas,
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
      <div className="flex flex-col items-center gap-sm rounded-lg border border-cinza-200 bg-cinza-0 p-xl py-3xl text-center shadow-xs">
        <Scissors className="h-8 w-8 text-cinza-300" aria-hidden="true" />
        <h2 className="text-titulo-card text-cinza-700">Nenhuma peça no plano de corte ainda</h2>
        <p className="max-w-sm text-corpo-pequeno text-cinza-500">
          O plano de corte e a lista de material são calculados a partir dos itens posicionados
          na aba Ambientes. Adicione ao menos um item para ver o plano de corte aqui.
        </p>
        <Button variant="primary" onClick={() => irParaAba("ambientes")}>
          Ir para Ambientes
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <h2 className="mb-xs text-titulo-secao text-cinza-900">Plano de corte</h2>
        <p className="mb-md text-corpo-pequeno text-cinza-500">
          Chapas de {grupos[0]?.larguraChapa ?? 2750}×{grupos[0]?.alturaChapa ?? 1840}mm, escala 1:10.
          Empacotamento heurístico (prateleiras) — validação visual, não substitui um otimizador de
          corte industrial. Restrição de sentido do veio já aplicada por peça.
        </p>
        <div className="flex flex-col gap-lg">
          {grupos.map((grupo) => {
            const areaConsumidaM2 = grupo.chapas.reduce(
              (soma, chapa) => soma + chapa.pecas.reduce((s, p) => s + (p.w * p.h) / 1_000_000, 0),
              0
            );
            return (
              <div key={`${grupo.cor}-${grupo.espessura_mm}`}>
                <div className="mb-sm flex flex-wrap items-baseline justify-between gap-sm">
                  <h3 className="text-titulo-card text-cinza-900">
                    MDF {grupo.cor} {grupo.espessura_mm}mm
                  </h3>
                  <span className="text-corpo-pequeno text-cinza-500 tabular-nums">
                    {grupo.chapas.length} chapa(s) · {areaConsumidaM2.toFixed(2)} m² consumidos
                  </span>
                </div>
                <div className="flex flex-wrap gap-md">
                  {grupo.chapas.map((chapa) => (
                    <div key={chapa.index}>
                      <PlanoCorteCanvas
                        chapa={chapa}
                        larguraChapa={grupo.larguraChapa}
                        alturaChapa={grupo.alturaChapa}
                      />
                      <Progress
                        value={chapa.aproveitamento * 100}
                        corPreenchimento={corAproveitamento(chapa.aproveitamento)}
                        className="mt-xs"
                      />
                    </div>
                  ))}
                </div>
                {grupo.pecasForaDaChapa.length > 0 && (
                  <Alert variant="aviso" className="mt-sm">
                    <AlertDescription>
                      {grupo.pecasForaDaChapa.length} peça(s) maior(es) que a chapa em qualquer
                      orientação: {grupo.pecasForaDaChapa.map((p) => p.nome).join(", ")}.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
          <h2 className="text-titulo-secao text-cinza-900">Lista de material / pré-pedido</h2>
          <div className="flex gap-sm">
            <Button variant="ghost" size="sm" onClick={handleExportarTxt}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Baixar TXT
            </Button>
            <Button variant="ghost" size="sm" onClick={handleExportarCsv}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Baixar CSV
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead className="text-right">Valor unitário</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-8" aria-hidden="true" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((linha, i) => (
              <TableRow key={`bom-${i}`}>
                <TableCell>{linha.item}</TableCell>
                <TableCell className="text-cinza-500">{linha.categoria}</TableCell>
                <TableCell>{linha.qtd}</TableCell>
                <TableCell className="text-right tabular-nums">{formatarMoeda(linha.unit)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatarMoeda(linha.total)}</TableCell>
                <TableCell />
              </TableRow>
            ))}
            {itensManuais.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.descricao}</TableCell>
                <TableCell className="text-cinza-500">Serviço</TableCell>
                <TableCell>{item.quantidade}</TableCell>
                <TableCell className="text-right tabular-nums">{formatarMoeda(item.valorUnitario)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatarMoeda(item.quantidade * item.valorUnitario)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removerItemManual(item.id)}
                    aria-label={`Remover ${item.descricao}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 border-cinza-300 bg-cinza-50 font-bold hover:bg-cinza-50">
              <TableCell colSpan={4}>Subtotal material</TableCell>
              <TableCell className="text-right tabular-nums">{formatarMoeda(subtotal)}</TableCell>
              <TableCell />
            </TableRow>
            <TableRow className="bg-cinza-50 font-bold hover:bg-cinza-50">
              <TableCell colSpan={4}>Subtotal itens manuais</TableCell>
              <TableCell className="text-right tabular-nums">{formatarMoeda(subtotalManual)}</TableCell>
              <TableCell />
            </TableRow>
            <TableRow className="bg-cinza-50 font-bold hover:bg-cinza-50">
              <TableCell colSpan={4} className="text-titulo-card">
                Total do pré-pedido
              </TableCell>
              <TableCell className="text-right text-valor-destaque tabular-nums">
                {formatarMoeda(totalGeral)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>

        <p className="mt-sm text-corpo-pequeno text-cinza-500">
          Frete:{" "}
          {frete !== null ? (
            <span className="tabular-nums text-cinza-800">{formatarMoeda(frete)}</span>
          ) : (
            "não informado"
          )}{" "}
          — informativo; o valor final de frete e montagem é definido na aba Financeiro.
        </p>

        <div className="mt-lg flex flex-wrap items-end gap-sm border-t border-cinza-200 pt-md">
          <div className="flex-1 basis-48">
            <Label htmlFor="item-manual-descricao">Descrição</Label>
            <Input
              id="item-manual-descricao"
              value={formDescricao}
              onChange={(e) => setFormDescricao(e.target.value)}
              placeholder="Ex.: Instalação de nicho especial"
            />
          </div>
          <div className="w-24">
            <Label htmlFor="item-manual-qtd">Quantidade</Label>
            <Input
              id="item-manual-qtd"
              type="number"
              min={1}
              value={formQuantidade}
              onChange={(e) => setFormQuantidade(Number(e.target.value) || 0)}
            />
          </div>
          <div className="w-32">
            <Label htmlFor="item-manual-valor">Valor unitário</Label>
            <Input
              id="item-manual-valor"
              type="number"
              min={0}
              step="0.01"
              value={formValorUnitario}
              onChange={(e) => setFormValorUnitario(Number(e.target.value) || 0)}
            />
          </div>
          <Button variant="primary" onClick={adicionarItemManual}>
            Adicionar item
          </Button>
        </div>
      </section>

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
