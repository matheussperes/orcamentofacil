"use client";

import { useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calcularEngineOrcamento } from "@/lib/ambiente/calcularEngineOrcamento";
import { carregarCatalogo, catalogoParaPrecos, type Catalogo } from "@/lib/catalog";
import { PRECOS_REFERENCIA } from "@/lib/engine/prices";
import { ratearPrecificacao, type ModoMontagem, type ModoPrecificacao, type ResumoFinanceiro } from "@/lib/engine/precificacao";
import type { EstadoAmbiente } from "@/lib/ambiente/estado";
import type { ConfiguracaoPrecificacaoCarregada } from "@/lib/precificacao/carregarConfiguracao";
import type { ResultadoSalvarConfiguracao } from "@/lib/orcamento/salvarConfiguracaoPrecificacao";
import { formatarMoeda } from "@/lib/format";
import { useIrParaAba } from "./AbaAtivaContext";

// Task 13.5 (contrato .maestro/tmp/13.5-contract.md) — componente
// PRESENTACIONAL da aba "Financeiro" (mesmo espírito de `CorteMaterialLab`,
// Task 13.4): recebe o `EstadoAmbiente` já carregado (a MESMA leitura de
// `carregarEstadoAmbiente` usada pelas outras duas abas) + a configuração de
// precificação/montagem/frete já resolvida do servidor
// (`carregarConfiguracaoPrecificacao`) e liga de verdade `ratearPrecificacao`/
// `calcularResumoFinanceiro` (Task 12.6) — RESOLVE A DÍVIDA B2. Não sabe de
// Supabase — `onSalvar` é injetado por quem monta este componente
// (`FinanceiroTabConectada`/`FinanceiroTabMock`).
//
// Decisão de escopo (documentada aqui, não só no contrato): a Task 13.6
// (Linhas de Proposta) não existe ainda, então `ratearPrecificacao` roda com
// um ÚNICO grupo trivial cobrindo todos os itens do orçamento — o rateio por
// grupo (`ValorGrupo[]`) do retorno é ignorado por completo aqui, só
// `resumo` (os 6 campos) é usado. Quando a 13.6 existir, ela troca esse
// grupo único pelas Linhas de Proposta reais sem mudar o resto do wiring.
export interface FinanceiroLabProps {
  orcamentoId: string;
  estadoInicial: EstadoAmbiente;
  configuracaoInicial: ConfiguracaoPrecificacaoCarregada;
  onSalvar: (
    precificacao: ModoPrecificacao | null,
    montagem: ModoMontagem | null,
    frete: number
  ) => Promise<ResultadoSalvarConfiguracao>;
}

function percentParaFracao(percent: number): number {
  return percent / 100;
}
function fracaoParaPercent(fracao: number): number {
  return Math.round(fracao * 10000) / 100;
}

function CampoResumo({
  rotulo,
  valor,
  destaque,
  tom,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  tom?: "sucesso" | "erro";
}) {
  return (
    <div
      className={
        destaque
          ? "rounded-lg border border-accent-border bg-accent-subtle p-lg"
          : "rounded-lg border border-cinza-200 bg-cinza-0 p-lg"
      }
    >
      <p className="text-legenda font-semibold uppercase tracking-[0.03em] text-cinza-500">{rotulo}</p>
      <p
        className={
          "mt-2 text-valor-destaque tabular-nums " +
          (destaque ? "text-accent" : tom === "sucesso" ? "text-sucesso" : tom === "erro" ? "text-erro" : "text-cinza-900")
        }
      >
        {valor}
      </p>
    </div>
  );
}

export function FinanceiroLab({ orcamentoId: _orcamentoId, estadoInicial, configuracaoInicial, onSalvar }: FinanceiroLabProps) {
  const irParaAba = useIrParaAba();

  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  useEffect(() => {
    setCatalogo(carregarCatalogo());
  }, []);
  const precos = catalogo ? catalogoParaPrecos(catalogo) : PRECOS_REFERENCIA;

  const resultadoEngine = useMemo(() => calcularEngineOrcamento(estadoInicial), [estadoInicial]);

  const [usarPadraoPrecificacao, setUsarPadraoPrecificacao] = useState(
    configuracaoInicial.precificacaoOverride === null
  );
  const [precificacaoLocal, setPrecificacaoLocal] = useState<ModoPrecificacao>(
    configuracaoInicial.precificacaoOverride ?? configuracaoInicial.precificacaoPadraoOrg
  );
  const [usarPadraoMontagem, setUsarPadraoMontagem] = useState(configuracaoInicial.montagemOverride === null);
  const [montagemLocal, setMontagemLocal] = useState<ModoMontagem>(
    configuracaoInicial.montagemOverride ?? configuracaoInicial.montagemPadraoOrg
  );
  const [frete, setFrete] = useState(configuracaoInicial.config.freteTotal);

  const precificacaoEfetiva = usarPadraoPrecificacao ? configuracaoInicial.precificacaoPadraoOrg : precificacaoLocal;
  const montagemEfetiva = usarPadraoMontagem ? configuracaoInicial.montagemPadraoOrg : montagemLocal;

  const resultadoResumo = useMemo(() => {
    if (!resultadoEngine.ok) return { ok: false as const };
    try {
      const grupoUnico = [
        { id: "orcamento-inteiro", itemIds: resultadoEngine.engine.porModulo.map((m) => m.moduloId) },
      ];
      const snapshot = ratearPrecificacao(
        resultadoEngine.engine,
        grupoUnico,
        { precificacao: precificacaoEfetiva, montagem: montagemEfetiva, freteTotal: frete },
        precos
      );
      return { ok: true as const, resumo: snapshot.resumo };
    } catch (erro) {
      console.error("[financeiro] falha ao calcular o resumo financeiro:", erro);
      return { ok: false as const };
    }
  }, [resultadoEngine, precificacaoEfetiva, montagemEfetiva, frete, precos]);

  const [salvando, setSalvando] = useState(false);
  const [resultadoSalvar, setResultadoSalvar] = useState<ResultadoSalvarConfiguracao | null>(null);

  async function handleSalvar() {
    setSalvando(true);
    setResultadoSalvar(null);
    const resultado = await onSalvar(
      usarPadraoPrecificacao ? null : precificacaoLocal,
      usarPadraoMontagem ? null : montagemLocal,
      frete
    );
    setSalvando(false);
    setResultadoSalvar(resultado);
  }

  if (!resultadoEngine.ok) {
    return (
      <Alert variant="erro">
        <AlertDescription>
          Não foi possível calcular o resumo financeiro deste orçamento. Volte para a aba Ambientes
          e confira a configuração dos itens posicionados.
        </AlertDescription>
      </Alert>
    );
  }

  if (resultadoEngine.engine.porModulo.length === 0) {
    return (
      <div className="flex flex-col items-center gap-sm rounded-lg border border-cinza-200 bg-cinza-0 p-xl py-3xl text-center shadow-xs">
        <Wallet className="h-8 w-8 text-cinza-300" aria-hidden="true" />
        <h2 className="text-titulo-card text-cinza-700">Nenhum item para calcular ainda</h2>
        <p className="max-w-sm text-corpo-pequeno text-cinza-500">
          O resumo financeiro é calculado a partir dos itens posicionados na aba Ambientes.
          Adicione ao menos um item para ver os números aqui.
        </p>
        <Button variant="primary" onClick={() => irParaAba("ambientes")}>
          Ir para Ambientes
        </Button>
      </div>
    );
  }

  const resumo: ResumoFinanceiro | null = resultadoResumo.ok ? resultadoResumo.resumo : null;

  return (
    <div className="flex flex-col gap-lg">
      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <h2 className="mb-md text-titulo-secao text-cinza-900">Resumo financeiro</h2>
        {resumo ? (
          <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
            <CampoResumo rotulo="Preço final" valor={formatarMoeda(resumo.precoFinal)} destaque />
            <CampoResumo rotulo="Custo material" valor={formatarMoeda(resumo.custoMaterial)} />
            <CampoResumo rotulo="Montagem" valor={formatarMoeda(resumo.montagem)} />
            <CampoResumo rotulo="Frete" valor={formatarMoeda(resumo.frete)} />
            <CampoResumo
              rotulo="Lucro final"
              valor={formatarMoeda(resumo.lucroFinal)}
              tom={resumo.lucroFinal >= 0 ? "sucesso" : "erro"}
            />
            <CampoResumo
              rotulo="Margem de lucro"
              valor={`${fracaoParaPercent(resumo.margemLucro).toFixed(1)}%`}
              tom={resumo.margemLucro >= 0 ? "sucesso" : "erro"}
            />
          </div>
        ) : (
          <Alert variant="erro">
            <AlertDescription>Não foi possível calcular o resumo com a configuração atual.</AlertDescription>
          </Alert>
        )}
      </section>

      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <h2 className="mb-md text-titulo-secao text-cinza-900">Modo de precificação</h2>
        <div className="mb-sm flex items-center gap-sm">
          <Checkbox
            id="precificacao-padrao"
            checked={usarPadraoPrecificacao}
            onCheckedChange={(v) => setUsarPadraoPrecificacao(v === true)}
          />
          <Label htmlFor="precificacao-padrao" className="font-normal">
            Usar o padrão da organização ({rotuloModoPrecificacao(configuracaoInicial.precificacaoPadraoOrg)})
          </Label>
        </div>
        {!usarPadraoPrecificacao && (
          <div className="flex flex-wrap items-end gap-sm">
            <div>
              <Label htmlFor="precificacao-modo">Modo</Label>
              <Select
                value={precificacaoLocal.modo}
                onValueChange={(v) => setPrecificacaoLocal(novoModoPrecificacao(v, precificacaoLocal))}
              >
                <SelectTrigger id="precificacao-modo" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiplicador">Multiplicador sobre material</SelectItem>
                  <SelectItem value="percentual">Percentual sobre material</SelectItem>
                  <SelectItem value="por_chapa">Valor por chapa</SelectItem>
                  <SelectItem value="fixo">Valor fixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CampoNumericoModoPrecificacao valor={precificacaoLocal} onChange={setPrecificacaoLocal} />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <h2 className="mb-md text-titulo-secao text-cinza-900">Modo de montagem</h2>
        <div className="mb-sm flex items-center gap-sm">
          <Checkbox
            id="montagem-padrao"
            checked={usarPadraoMontagem}
            onCheckedChange={(v) => setUsarPadraoMontagem(v === true)}
          />
          <Label htmlFor="montagem-padrao" className="font-normal">
            Usar o padrão da organização ({rotuloModoMontagem(configuracaoInicial.montagemPadraoOrg)})
          </Label>
        </div>
        {!usarPadraoMontagem && (
          <div className="flex flex-wrap items-end gap-sm">
            <div>
              <Label htmlFor="montagem-modo">Modo</Label>
              <Select value={montagemLocal.modo} onValueChange={(v) => setMontagemLocal(novoModoMontagem(v, montagemLocal))}>
                <SelectTrigger id="montagem-modo" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual_material">Percentual sobre material</SelectItem>
                  <SelectItem value="por_chapa">Valor por chapa</SelectItem>
                  <SelectItem value="manual">Valor manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CampoNumericoModoMontagem valor={montagemLocal} onChange={setMontagemLocal} />
          </div>
        )}
      </section>

      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <h2 className="mb-md text-titulo-secao text-cinza-900">Frete</h2>
        <div className="w-40">
          <Label htmlFor="frete">Frete (R$)</Label>
          <Input
            id="frete"
            type="number"
            min={0}
            step="0.01"
            value={frete}
            onChange={(e) => setFrete(Number(e.target.value) || 0)}
          />
        </div>
      </section>

      <section className="flex flex-col items-start gap-sm rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <Button variant="primary" onClick={handleSalvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar alterações"}
        </Button>
        {resultadoSalvar && (
          <Alert variant={resultadoSalvar.ok ? "sucesso" : "erro"} className="w-full">
            <AlertDescription>
              {resultadoSalvar.ok
                ? "Configuração financeira salva com sucesso."
                : (resultadoSalvar.erro ?? "Não foi possível salvar a configuração financeira.")}
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}

function rotuloModoPrecificacao(modo: ModoPrecificacao): string {
  switch (modo.modo) {
    case "multiplicador":
      return `× ${modo.fator}`;
    case "percentual":
      return `+${fracaoParaPercent(modo.percentual)}%`;
    case "por_chapa":
      return `${formatarMoeda(modo.valorChapa)}/chapa`;
    case "fixo":
      return formatarMoeda(modo.valor);
  }
}

function rotuloModoMontagem(modo: ModoMontagem): string {
  switch (modo.modo) {
    case "percentual_material":
      return `${fracaoParaPercent(modo.percentual)}% do material`;
    case "por_chapa":
      return `${formatarMoeda(modo.valorChapa)}/chapa`;
    case "manual":
      return formatarMoeda(modo.valor);
  }
}

function novoModoPrecificacao(modo: string, atual: ModoPrecificacao): ModoPrecificacao {
  switch (modo) {
    case "multiplicador":
      return { modo: "multiplicador", fator: 2 };
    case "percentual":
      return { modo: "percentual", percentual: 0.5 };
    case "por_chapa":
      return { modo: "por_chapa", valorChapa: 100 };
    case "fixo":
      return { modo: "fixo", valor: 1000 };
    default:
      return atual;
  }
}
function novoModoMontagem(modo: string, atual: ModoMontagem): ModoMontagem {
  switch (modo) {
    case "percentual_material":
      return { modo: "percentual_material", percentual: 0.1 };
    case "por_chapa":
      return { modo: "por_chapa", valorChapa: 30 };
    case "manual":
      return { modo: "manual", valor: 200 };
    default:
      return atual;
  }
}

function CampoNumericoModoPrecificacao({
  valor,
  onChange,
}: {
  valor: ModoPrecificacao;
  onChange: (v: ModoPrecificacao) => void;
}) {
  if (valor.modo === "multiplicador") {
    return (
      <div className="w-32">
        <Label htmlFor="precificacao-fator">Fator</Label>
        <Input
          id="precificacao-fator"
          type="number"
          step="0.1"
          min={0}
          value={valor.fator}
          onChange={(e) => onChange({ modo: "multiplicador", fator: Number(e.target.value) || 0 })}
        />
      </div>
    );
  }
  if (valor.modo === "percentual") {
    return (
      <div className="w-32">
        <Label htmlFor="precificacao-percentual">Percentual (%)</Label>
        <Input
          id="precificacao-percentual"
          type="number"
          step="1"
          min={0}
          value={fracaoParaPercent(valor.percentual)}
          onChange={(e) => onChange({ modo: "percentual", percentual: percentParaFracao(Number(e.target.value) || 0) })}
        />
      </div>
    );
  }
  if (valor.modo === "por_chapa") {
    return (
      <div className="w-32">
        <Label htmlFor="precificacao-valor-chapa">Valor/chapa (R$)</Label>
        <Input
          id="precificacao-valor-chapa"
          type="number"
          step="0.01"
          min={0}
          value={valor.valorChapa}
          onChange={(e) => onChange({ modo: "por_chapa", valorChapa: Number(e.target.value) || 0 })}
        />
      </div>
    );
  }
  return (
    <div className="w-32">
      <Label htmlFor="precificacao-valor-fixo">Valor fixo (R$)</Label>
      <Input
        id="precificacao-valor-fixo"
        type="number"
        step="0.01"
        min={0}
        value={valor.valor}
        onChange={(e) => onChange({ modo: "fixo", valor: Number(e.target.value) || 0 })}
      />
    </div>
  );
}

function CampoNumericoModoMontagem({ valor, onChange }: { valor: ModoMontagem; onChange: (v: ModoMontagem) => void }) {
  if (valor.modo === "percentual_material") {
    return (
      <div className="w-32">
        <Label htmlFor="montagem-percentual">Percentual (%)</Label>
        <Input
          id="montagem-percentual"
          type="number"
          step="1"
          min={0}
          value={fracaoParaPercent(valor.percentual)}
          onChange={(e) =>
            onChange({ modo: "percentual_material", percentual: percentParaFracao(Number(e.target.value) || 0) })
          }
        />
      </div>
    );
  }
  if (valor.modo === "por_chapa") {
    return (
      <div className="w-32">
        <Label htmlFor="montagem-valor-chapa">Valor/chapa (R$)</Label>
        <Input
          id="montagem-valor-chapa"
          type="number"
          step="0.01"
          min={0}
          value={valor.valorChapa}
          onChange={(e) => onChange({ modo: "por_chapa", valorChapa: Number(e.target.value) || 0 })}
        />
      </div>
    );
  }
  return (
    <div className="w-32">
      <Label htmlFor="montagem-valor-manual">Valor (R$)</Label>
      <Input
        id="montagem-valor-manual"
        type="number"
        step="0.01"
        min={0}
        value={valor.valor}
        onChange={(e) => onChange({ modo: "manual", valor: Number(e.target.value) || 0 })}
      />
    </div>
  );
}
