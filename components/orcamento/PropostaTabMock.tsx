"use client";

import { PropostaLab } from "./PropostaLab";
import { estadoMockPreenchido } from "@/lib/ambiente/estadoMockPreenchido";
import type { LinhaProposta, PatchLinhaProposta } from "@/lib/linha-proposta/tipos";
import type { ConfiguracaoPrecificacaoCarregada } from "@/lib/precificacao/carregarConfiguracao";

// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — harness DEV-ONLY
// (`/dev/preview/orcamento`), mesmo espírito de `FinanceiroTabMock.tsx`/
// `CorteMaterialTabMock.tsx`: sem Supabase, sem sessão real. "Mock o upload
// também" (contrato): `onRegenerarImagem` NUNCA chama Storage — converte o
// `Blob` capturado do canvas em `URL.createObjectURL(blob)` (URL local do
// browser, sem rede), que já é diretamente utilizável como `src` de `<img>`
// — por isso `onResolverUrlImagem` aqui é a função IDENTIDADE (o "path"
// mockado já É a URL de exibição, ao contrário do `PropostaTabConectada`
// real, que guarda um PATH de Storage e precisa assinar a URL sob demanda).
const CONFIGURACAO_MOCK: ConfiguracaoPrecificacaoCarregada = {
  config: {
    precificacao: { modo: "multiplicador", fator: 2 },
    montagem: { modo: "percentual_material", percentual: 0.1 },
    freteTotal: 200,
  },
  precificacaoOverride: null,
  montagemOverride: null,
  precificacaoPadraoOrg: { modo: "multiplicador", fator: 2 },
  montagemPadraoOrg: { modo: "percentual_material", percentual: 0.1 },
};

function novaLinhaMockId(): string {
  return `linha-mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// Estado inicial do harness: SEM linhas ainda (array vazio) — exercita o
// caminho "cria a linha default automaticamente" também no harness (mesma
// lógica de `PropostaLab.handleCriarLinhaInicial`, já que aqui não há um
// Server Component pra rodar `carregarOuCriarLinhasProposta` antes de
// montar). Diferença de escopo documentada: no app real a linha default é
// criada no SERVIDOR antes da primeira renderização (contrato); no harness,
// sem servidor, ela nasce do mesmo botão "Criar linha de proposta" do
// estado vazio — o resultado visual final é idêntico.
export function PropostaTabMock() {
  async function onCriarLinha(titulo: string, itens: string[], descricao: string) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const linha: LinhaProposta = {
      id: novaLinhaMockId(),
      titulo,
      itens,
      imagemUrl: null,
      descricao,
      valorRateado: null,
    };
    return { ok: true as const, linha };
  }

  async function onAtualizarLinha(_id: string, _patch: PatchLinhaProposta) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { ok: true };
  }

  async function onExcluirLinha(_id: string) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { ok: true };
  }

  async function onRegenerarImagem(_linhaId: string, blob: Blob) {
    const imagemUrl = URL.createObjectURL(blob);
    return { ok: true as const, imagemUrl };
  }

  async function onResolverUrlImagem(imagemUrl: string) {
    return imagemUrl;
  }

  async function onCongelarOrcamento(_orcamentoId: string) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { ok: true };
  }

  // Task 1.9-front — harness DEV-ONLY também mocka a reabertura, mesmo
  // espírito das demais funções acima (sem Supabase, sem sessão real).
  async function onReabrirOrcamento(_orcamentoId: string) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { ok: true };
  }

  return (
    <PropostaLab
      orcamentoId="preview-orcamento"
      estadoInicial={estadoMockPreenchido()}
      configuracaoInicial={CONFIGURACAO_MOCK}
      linhasIniciais={[]}
      congeladoEm={null}
      papel="admin"
      onCriarLinha={onCriarLinha}
      onAtualizarLinha={onAtualizarLinha}
      onExcluirLinha={onExcluirLinha}
      onRegenerarImagem={onRegenerarImagem}
      onResolverUrlImagem={onResolverUrlImagem}
      onCongelarOrcamento={onCongelarOrcamento}
      onReabrirOrcamento={onReabrirOrcamento}
    />
  );
}
