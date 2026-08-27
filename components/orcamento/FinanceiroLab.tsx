"use client";

import { useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TituloSecao } from "@/components/ui/titulo-secao";
import { EstadoVazioAba } from "@/components/ui/estado-vazio-aba";
import { calcularEngineOrcamento } from "@/lib/ambiente/calcularEngineOrcamento";
import { catalogoParaPrecos, type Catalogo } from "@/lib/catalog";
import { buscarCatalogoReal } from "@/lib/produto/buscar";
import { PRECOS_REFERENCIA } from "@/lib/engine/prices";
import { ratearPrecificacao, type ModoMontagem, type ModoPrecificacao, type ResumoFinanceiro } from "@/lib/engine/precificacao";
import type { EstadoAmbiente } from "@/lib/ambiente/estado";
import type { ConfiguracaoPrecificacaoCarregada } from "@/lib/precificacao/carregarConfiguracao";
import type { ResultadoSalvarConfiguracao } from "@/lib/orcamento/salvarConfiguracaoPrecificacao";
import { formatarMoeda, formatarPercentual } from "@/lib/format";
import { fracaoParaPercent } from "@/components/precificacao/formatoPercentual";
import { rotuloModoPrecificacao, SeletorModoPrecificacao } from "@/components/precificacao/SeletorModoPrecificacao";
import { rotuloModoMontagem, SeletorModoMontagem } from "@/components/precificacao/SeletorModoMontagem";
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

  // Task 13.7b (contrato .maestro/tmp/13.7b-contract.md) — catálogo REAL da
  // organização (Supabase, `produto`), substituindo `carregarCatalogo()`
  // (localStorage) — mesmo comentário completo em `CorteMaterialLab.tsx`.
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
      <EstadoVazioAba
        icone={Wallet}
        titulo="Nenhum item para calcular ainda"
        descricao="O resumo financeiro é calculado a partir dos itens posicionados na aba Ambientes. Adicione ao menos um item para ver os números aqui."
        acao={
          <Button variant="primary" onClick={() => irParaAba("ambientes")}>
            Ir para Ambientes
          </Button>
        }
      />
    );
  }

  const resumo: ResumoFinanceiro | null = resultadoResumo.ok ? resultadoResumo.resumo : null;

  return (
    <div className="flex flex-col gap-lg">
      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <TituloSecao>Resumo financeiro</TituloSecao>
        {resumo ? (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
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
              valor={formatarPercentual(fracaoParaPercent(resumo.margemLucro))}
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
        <TituloSecao>Modo de precificação</TituloSecao>
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
          <SeletorModoPrecificacao valor={precificacaoLocal} onChange={setPrecificacaoLocal} />
        )}
      </section>

      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <TituloSecao>Modo de montagem</TituloSecao>
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
          <SeletorModoMontagem valor={montagemLocal} onChange={setMontagemLocal} />
        )}
      </section>

      <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
        <TituloSecao>Frete</TituloSecao>
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
