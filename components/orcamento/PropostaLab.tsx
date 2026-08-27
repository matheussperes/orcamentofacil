"use client";

import { AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EstadoVazioAba } from "@/components/ui/estado-vazio-aba";
import { formatarDataHora } from "@/lib/format";
import type { EstadoAmbiente } from "@/lib/ambiente/estado";
import type { ConfiguracaoPrecificacaoCarregada } from "@/lib/precificacao/carregarConfiguracao";
import type {
  LinhaProposta,
  PatchLinhaProposta,
  ResultadoLinhaProposta,
  ResultadoOperacaoLinhaProposta,
} from "@/lib/linha-proposta/tipos";
import { LinhaPropostaCard } from "./LinhaPropostaCard";
import { useIrParaAba } from "./AbaAtivaContext";
import { ReabrirOrcamentoDialog } from "./proposta/ReabrirOrcamentoDialog";
import { usePropostaLab } from "./proposta/usePropostaLab";

// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — componente
// PRESENTACIONAL da aba "Proposta" (mesmo espírito de `CorteMaterialLab.tsx`/
// `FinanceiroLab.tsx`): recebe o `EstadoAmbiente` já carregado (a MESMA
// leitura das outras 3 abas) + a `ConfiguracaoPrecificacaoCarregada` (Task
// 13.5, reaproveitada sem duplicar) + as `linhasIniciais` já carregadas/
// criadas no servidor (`lib/linha-proposta/carregar.ts`) e liga de verdade
// `ratearPrecificacao` a GRUPOS REAIS (um `GrupoItens` por Linha de Proposta)
// — RESOLVE A DÍVIDA B2 de vez (Task 13.5 usava um grupo único trivial,
// documentado como provisório em `FinanceiroLab.tsx`, que esta task NÃO
// altera — ele continua com o grupo único de propósito, ver contrato).
//
// Toda escrita (criar/atualizar/excluir linha, regenerar imagem, resolver
// URL de exibição) é injetada via props — este componente não sabe de
// Supabase (`PropostaTabConectada`/`PropostaTabMock` decidem a implementação
// real, mesmo padrão das outras 3 abas).
//
// Task R.5a — todo o estado e os handlers foram extraídos para
// `proposta/usePropostaLab.ts` (decomposição pura, teto de 400 linhas/
// arquivo, apresentação separada de lógica): este componente só compõe JSX.
export interface PropostaLabProps {
  orcamentoId: string;
  estadoInicial: EstadoAmbiente;
  configuracaoInicial: ConfiguracaoPrecificacaoCarregada;
  linhasIniciais: LinhaProposta[];
  // Task 0.7b (Modelo-de-Dominio.md 5.4.1) — única fonte de verdade de
  // congelamento (I1); `null` = nunca congelado / reaberto (R1, ao vivo).
  congeladoEm: string | null;
  // Task 1.9-front (Design-System.md §7.13.1, Q-18) — papel do usuário
  // logado nesta organização; só `"admin"` vê o botão "Reabrir orçamento"
  // no `Alert` de orçamento congelado.
  papel: string | null;
  onCriarLinha: (titulo: string, itens: string[], descricao: string) => Promise<ResultadoLinhaProposta>;
  onAtualizarLinha: (id: string, patch: PatchLinhaProposta) => Promise<ResultadoOperacaoLinhaProposta>;
  onExcluirLinha: (id: string) => Promise<ResultadoOperacaoLinhaProposta>;
  onRegenerarImagem: (
    linhaId: string,
    blob: Blob
  ) => Promise<{ ok: true; imagemUrl: string } | { ok: false; erro: string }>;
  onResolverUrlImagem: (imagemUrl: string) => Promise<string | null>;
  onCongelarOrcamento: (orcamentoId: string) => Promise<ResultadoOperacaoLinhaProposta>;
  onReabrirOrcamento: (orcamentoId: string) => Promise<ResultadoOperacaoLinhaProposta>;
}

export function PropostaLab(props: PropostaLabProps) {
  const { estadoInicial, papel, onResolverUrlImagem } = props;
  const irParaAba = useIrParaAba();
  const lab = usePropostaLab(props);

  if (!lab.resultadoEngine.ok) {
    return (
      <Alert variant="erro">
        <AlertDescription>
          Não foi possível calcular a proposta deste orçamento. Volte para a aba Ambientes e confira a
          configuração dos itens posicionados.
        </AlertDescription>
      </Alert>
    );
  }

  if (lab.resultadoEngine.engine.porModulo.length === 0) {
    return (
      <EstadoVazioAba
        icone={FileText}
        titulo="Nenhum item para propor ainda"
        descricao="As linhas de proposta são criadas a partir dos itens posicionados na aba Ambientes. Adicione ao menos um item para gerar a proposta aqui."
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
      {lab.congeladoEm !== null && (
        <Alert variant="aviso">
          <AlertTriangle className="h-4 w-4 text-aviso" aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-sm">
            <span>
              Esta proposta está congelada desde {formatarDataHora(lab.congeladoEm)}. Suas alterações não
              mudam os valores até você reabrir o orçamento.
            </span>
            {papel === "admin" && (
              <Button variant="ghost" size="sm" onClick={() => lab.setDialogReabrirAberto(true)}>
                Reabrir orçamento
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Alert variant="informacao">
        <AlertDescription>
          Remover um ambiente aumenta o preço dos demais; regenere a proposta depois de dividir, mesclar
          ou editar o valor de uma linha.
        </AlertDescription>
      </Alert>

      {lab.linhas.length === 0 ? (
        <EstadoVazioAba
          icone={FileText}
          titulo="Nenhuma linha de proposta ainda"
          descricao="Crie a primeira linha cobrindo todos os itens deste orçamento — depois é possível dividir ou mesclar linhas."
          acao={
            <Button variant="primary" onClick={lab.handleCriarLinhaInicial} disabled={lab.criandoLinhaInicial}>
              {lab.criandoLinhaInicial ? "Criando…" : "Criar linha de proposta"}
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-lg">
            {lab.linhas.map((linha) => (
              <LinhaPropostaCard
                key={linha.id}
                linha={linha}
                alturas={estadoInicial.alturas}
                itensDoConjunto={lab.itensDoConjuntoDaLinha(linha)}
                itensDisponiveis={lab.itensDisponiveisDaLinha(linha)}
                valorAtual={lab.valorAtualDaLinha(linha)}
                nomesAmbientes={lab.nomesAmbientesDaLinha(linha)}
                mostrarSelecaoMesclar={lab.linhas.length > 1}
                selecionadaParaMesclar={lab.selecionadasParaMesclar.has(linha.id)}
                onToggleSelecaoMesclar={() => lab.toggleSelecaoMesclar(linha.id)}
                onSalvarTextos={(patch) => lab.handleSalvarTextos(linha.id, patch)}
                onOverrideValor={(novoValor) => lab.handleOverrideValor(linha.id, novoValor)}
                onDividir={(itemIds) => lab.handleDividirLinha(linha, itemIds)}
                onRegenerarImagem={(blob) => lab.handleRegenerarImagem(linha.id, blob)}
                onResolverUrlImagem={onResolverUrlImagem}
                onReverterDivisao={
                  lab.origemSplit[linha.id] && lab.linhas.some((l) => l.id === lab.origemSplit[linha.id])
                    ? () => lab.handleReverterDivisao(linha.id)
                    : undefined
                }
              />
            ))}
          </div>

          {lab.selecionadasParaMesclar.size >= 2 && (
            <div className="flex justify-start">
              <Button variant="primary" onClick={lab.handleMesclarSelecionadas}>
                Mesclar {lab.selecionadasParaMesclar.size} linhas selecionadas
              </Button>
            </div>
          )}

          {lab.resultadoRateio.ok && lab.resultadoRateio.snapshot.warnings.length > 0 && (
            <Alert variant="aviso">
              <AlertDescription>
                {lab.resultadoRateio.snapshot.warnings.length} aviso(s) no rateio por linha: itens fora de
                qualquer Linha de Proposta não entram no valor rateado. Divida ou edite as linhas para
                incluí-los.
              </AlertDescription>
            </Alert>
          )}

          <section className="flex flex-col items-start gap-sm rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
            <Button variant="primary" onClick={lab.handleGerarProposta} disabled={lab.gerandoProposta}>
              {lab.gerandoProposta ? "Gerando…" : "Gerar proposta"}
            </Button>
            {lab.erroGeral && (
              <Alert variant="erro" className="w-full">
                <AlertDescription>{lab.erroGeral}</AlertDescription>
              </Alert>
            )}
          </section>
        </>
      )}

      <ReabrirOrcamentoDialog
        aberto={lab.dialogReabrirAberto}
        onOpenChange={(aberto) => {
          lab.setDialogReabrirAberto(aberto);
          if (aberto) lab.setErroReabrir(null);
        }}
        erro={lab.erroReabrir}
        reabrindo={lab.reabrindo}
        onConfirmar={lab.handleConfirmarReabrir}
      />
    </div>
  );
}
