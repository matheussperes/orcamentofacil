"use client";

import { PropostaLab } from "./PropostaLab";
import { criarLinhaProposta, atualizarLinhaProposta, excluirLinhaProposta } from "@/lib/linha-proposta/acoes";
import { obterUrlAssinadaImagemLinha, uploadImagemLinhaProposta } from "@/lib/linha-proposta/storage";
import type { LinhaProposta } from "@/lib/linha-proposta/tipos";
import type { EstadoAmbiente } from "@/lib/ambiente/estado";
import type { ConfiguracaoPrecificacaoCarregada } from "@/lib/precificacao/carregarConfiguracao";

// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — "dono de I/O" da aba
// "Proposta" em `/orcamento/[id]`, mesmo padrão de
// `FinanceiroTabConectada.tsx`/`CorteMaterialTabConectada.tsx`: recebe
// `estadoInicial`/`configuracaoInicial` já carregados pelo Server Component
// da rota (as MESMAS leituras que as outras abas usam) + `linhasIniciais`
// (já carregadas/criadas por `lib/linha-proposta/carregar.ts`) e liga o
// `PropostaLab` (presentational) às Server Actions de
// `lib/linha-proposta/acoes.ts` + ao upload de imagem no Storage
// (`lib/linha-proposta/storage.ts`, client-side — só aqui, nunca em
// `PropostaLab`).
export interface PropostaTabConectadaProps {
  orcamentoId: string;
  organizacaoId: string | null;
  estadoInicial: EstadoAmbiente;
  configuracaoInicial: ConfiguracaoPrecificacaoCarregada;
  linhasIniciais: LinhaProposta[];
}

export function PropostaTabConectada({
  orcamentoId,
  organizacaoId,
  estadoInicial,
  configuracaoInicial,
  linhasIniciais,
}: PropostaTabConectadaProps) {
  async function onCriarLinha(titulo: string, itens: string[], descricao: string) {
    return criarLinhaProposta(orcamentoId, titulo, itens, descricao);
  }

  async function onRegenerarImagem(linhaId: string, blob: Blob) {
    if (!organizacaoId) {
      return { ok: false as const, erro: "Não foi possível identificar sua organização para salvar a imagem." };
    }
    const resultadoUpload = await uploadImagemLinhaProposta(organizacaoId, linhaId, blob);
    if (!resultadoUpload.ok) return { ok: false as const, erro: resultadoUpload.erro };
    const resultadoPersistir = await atualizarLinhaProposta(linhaId, { imagemUrl: resultadoUpload.path });
    if (!resultadoPersistir.ok) {
      return {
        ok: false as const,
        erro: resultadoPersistir.erro ?? "Não foi possível salvar a referência da imagem desta linha.",
      };
    }
    return { ok: true as const, imagemUrl: resultadoUpload.path };
  }

  return (
    <PropostaLab
      orcamentoId={orcamentoId}
      estadoInicial={estadoInicial}
      configuracaoInicial={configuracaoInicial}
      linhasIniciais={linhasIniciais}
      onCriarLinha={onCriarLinha}
      onAtualizarLinha={atualizarLinhaProposta}
      onExcluirLinha={excluirLinhaProposta}
      onRegenerarImagem={onRegenerarImagem}
      onResolverUrlImagem={obterUrlAssinadaImagemLinha}
    />
  );
}
