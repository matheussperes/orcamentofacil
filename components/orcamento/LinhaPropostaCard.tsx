"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, RefreshCw, Split, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BoxCanvas, type ItemDoConjunto } from "@/app/components/BoxCanvas";
import { canvasParaBlobPng } from "@/lib/linha-proposta/storage";
import type { LinhaProposta } from "@/lib/linha-proposta/tipos";
import type { AlturasFaixas } from "@/lib/engine/parede";
import { formatarMoeda } from "@/lib/format";

// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — UMA Linha de
// Proposta (Design-System.md Seção 7.19, thumbnail `aspect-[4/3]`). Extraído
// de `PropostaLab.tsx` para não virar componente monolítico (regra rígida
// #8) — este arquivo só cuida de UMA linha; a lista/orquestração entre
// linhas (split cria/atualiza duas, mesclar atualiza uma e exclui outra,
// override recalcula todas) fica em `PropostaLab.tsx`, que é quem conhece o
// conjunto inteiro.
//
// Mecanismo de captura da imagem (contrato pede pra documentar): o
// `<canvas>` do modo "conjunto" do `BoxCanvas` é renderizado
// ESCONDIDO (`className="hidden"`, só para captura — Canvas 2D desenha e
// exporta normalmente independente de estar visível no layout) via
// `onCanvasReady` (retrofit aditivo da Task 13.6a em `BoxCanvas.tsx`). A
// imagem EXIBIDA (thumbnail visível, Design-System 7.19) vem de
// `linha.imagemUrl` já resolvido pra uma URL de exibição
// (`onResolverUrlImagem`, injetado pelo caller — signed URL no
// `PropostaTabConectada`, identidade no `PropostaTabMock`), não do canvas ao
// vivo — assim o que a UI mostra é exatamente o que está persistido no
// Storage (mesmo dado que a Task 13.6b vai reaproveitar no PDF), não uma
// prévia que poderia divergir do que foi salvo.
export interface ItemDisponivel {
  itemId: string;
  nome: string;
}

export interface LinhaPropostaCardProps {
  linha: LinhaProposta;
  alturas: AlturasFaixas;
  itensDoConjunto: ItemDoConjunto[];
  itensDisponiveis: ItemDisponivel[];
  valorAtual: number;
  mostrarSelecaoMesclar: boolean;
  selecionadaParaMesclar: boolean;
  onToggleSelecaoMesclar: () => void;
  onSalvarTextos: (patch: { titulo?: string; descricao?: string }) => Promise<{ ok: boolean; erro?: string }>;
  onOverrideValor: (novoValor: number) => void;
  onDividir: (itemIdsSelecionados: string[]) => Promise<{ ok: boolean; erro?: string }>;
  onRegenerarImagem: (blob: Blob) => Promise<{ ok: boolean; erro?: string }>;
  onResolverUrlImagem: (imagemUrl: string) => Promise<string | null>;
  /** Presente só na linha nascida de um split ainda revertível; ausente nas demais. */
  onReverterDivisao?: () => void;
}

export function LinhaPropostaCard({
  linha,
  alturas,
  itensDoConjunto,
  itensDisponiveis,
  valorAtual,
  mostrarSelecaoMesclar,
  selecionadaParaMesclar,
  onToggleSelecaoMesclar,
  onSalvarTextos,
  onOverrideValor,
  onDividir,
  onRegenerarImagem,
  onResolverUrlImagem,
  onReverterDivisao,
}: LinhaPropostaCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const registrarCanvas = useCallback((el: HTMLCanvasElement | null) => {
    canvasRef.current = el;
  }, []);

  // --- Render automático (Storage) ---
  const [regenerando, setRegenerando] = useState(false);
  const [erroImagem, setErroImagem] = useState<string | null>(null);
  const [urlExibicao, setUrlExibicao] = useState<string | null>(null);

  const regenerar = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || itensDoConjunto.length === 0) return;
    setRegenerando(true);
    setErroImagem(null);
    try {
      const blob = await canvasParaBlobPng(canvas);
      const resultado = await onRegenerarImagem(blob);
      if (!resultado.ok) {
        setErroImagem(resultado.erro ?? "Não foi possível atualizar o render desta linha. Tente novamente.");
      }
    } finally {
      setRegenerando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensDoConjunto.length]);

  // Gatilho de regeneração (contrato: "decisão sua se é automático ou um
  // botão") — decisão: AUTOMÁTICO sempre que o CONJUNTO de itens da linha
  // muda (inclui a primeira montagem — cobre a linha default recém-criada,
  // que ainda não tem imagem nenhuma) + um botão manual "Atualizar render"
  // abaixo, para o usuário forçar uma nova captura sem precisar mexer nos
  // itens (ex.: depois de reposicionar algo na aba Ambientes).
  const itensKey = linha.itens.join(",");
  useEffect(() => {
    regenerar();
    // Dependência proposital só em `itensKey` (não em `regenerar`, que muda
    // de identidade a cada render por depender de `itensDoConjunto.length`)
    // — dispara só quando o CONJUNTO de itens realmente muda, não a cada
    // commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itensKey]);

  useEffect(() => {
    let cancelado = false;
    if (!linha.imagemUrl) {
      setUrlExibicao(null);
      return;
    }
    onResolverUrlImagem(linha.imagemUrl).then((url) => {
      if (!cancelado) setUrlExibicao(url);
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linha.imagemUrl]);

  // --- Título/descrição ---
  const [tituloLocal, setTituloLocal] = useState(linha.titulo);
  const [descricaoLocal, setDescricaoLocal] = useState(linha.descricao);
  useEffect(() => setTituloLocal(linha.titulo), [linha.titulo]);
  useEffect(() => setDescricaoLocal(linha.descricao), [linha.descricao]);
  const [salvandoTextos, setSalvandoTextos] = useState(false);
  const [erroTextos, setErroTextos] = useState<string | null>(null);

  async function handleSalvarTextos() {
    setSalvandoTextos(true);
    setErroTextos(null);
    const resultado = await onSalvarTextos({ titulo: tituloLocal, descricao: descricaoLocal });
    setSalvandoTextos(false);
    if (!resultado.ok) setErroTextos(resultado.erro ?? "Não foi possível salvar esta linha. Tente novamente.");
  }

  // --- Override manual de valor ---
  const [editandoValor, setEditandoValor] = useState(false);
  const [valorEmEdicao, setValorEmEdicao] = useState(valorAtual);

  function confirmarOverride() {
    onOverrideValor(valorEmEdicao);
    setEditandoValor(false);
  }

  // --- Split ---
  const [dividindo, setDividindo] = useState(false);
  const [selecionadosParaDividir, setSelecionadosParaDividir] = useState<Set<string>>(new Set());
  const [erroDivisao, setErroDivisao] = useState<string | null>(null);
  const [dividindoEmAndamento, setDividindoEmAndamento] = useState(false);

  function toggleSelecaoDivisao(itemId: string, marcado: boolean) {
    setSelecionadosParaDividir((atuais) => {
      const novo = new Set(atuais);
      if (marcado) novo.add(itemId);
      else novo.delete(itemId);
      return novo;
    });
  }

  async function confirmarDivisao() {
    setDividindoEmAndamento(true);
    setErroDivisao(null);
    const resultado = await onDividir(Array.from(selecionadosParaDividir));
    setDividindoEmAndamento(false);
    if (resultado.ok) {
      setDividindo(false);
      setSelecionadosParaDividir(new Set());
    } else {
      setErroDivisao(resultado.erro ?? "Não foi possível dividir esta linha. Tente novamente.");
    }
  }

  return (
    <div className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      {/* `grid-cols-3` (utilitário padrão, não valor arbitrário) em vez de um
          `Npx` fixo pra coluna da thumbnail — 1/3 imagem, 2/3 conteúdo em
          telas `lg`+, empilhado em 1 coluna abaixo disso (mesmo critério de
          "não quebrar" das outras abas). */}
      <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-1">
          {/* Design-System.md Seção 7.19 — thumbnail `aspect-[4/3]`, placeholder `bg-cinza-100`. */}
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-cinza-200 bg-cinza-100">
            {urlExibicao ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={urlExibicao} alt={`Render de ${tituloLocal}`} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className="h-8 w-8 text-cinza-300" aria-hidden="true" />
              </div>
            )}
            {regenerando && (
              <div className="absolute inset-0 flex items-center justify-center bg-cinza-0/70">
                <span className="text-corpo-pequeno text-cinza-500">Atualizando render…</span>
              </div>
            )}
          </div>
          {/* Canvas de captura — nunca visível, só gera o PNG (ver comentário no topo do arquivo). */}
          <div className="hidden" aria-hidden="true">
            <BoxCanvas itens={itensDoConjunto} alturas={alturas} onCanvasReady={registrarCanvas} />
          </div>
          <Button variant="ghost" size="sm" className="mt-sm" onClick={regenerar} disabled={regenerando}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Atualizar render
          </Button>
          {erroImagem && (
            <Alert variant="erro" className="mt-sm">
              <AlertDescription>{erroImagem}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-md lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-sm">
            <div className="min-w-0 flex-1 basis-64">
              <Label htmlFor={`titulo-${linha.id}`}>Título da linha</Label>
              <Input id={`titulo-${linha.id}`} value={tituloLocal} onChange={(e) => setTituloLocal(e.target.value)} />
            </div>
            {mostrarSelecaoMesclar && (
              <label className="flex items-center gap-sm pt-5 text-corpo-pequeno text-cinza-600">
                <Checkbox checked={selecionadaParaMesclar} onCheckedChange={onToggleSelecaoMesclar} />
                Selecionar para mesclar
              </label>
            )}
          </div>

          <div className="min-w-0">
            <Label htmlFor={`descricao-${linha.id}`}>Descrição</Label>
            <Textarea
              id={`descricao-${linha.id}`}
              value={descricaoLocal}
              onChange={(e) => setDescricaoLocal(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-sm">
            <Button variant="primary" size="sm" onClick={handleSalvarTextos} disabled={salvandoTextos}>
              {salvandoTextos ? "Salvando…" : "Salvar alterações"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDividindo((v) => !v)}>
              <Split className="h-4 w-4" aria-hidden="true" />
              Dividir linha
            </Button>
            {onReverterDivisao && (
              <Button variant="ghost" size="sm" onClick={onReverterDivisao}>
                <Undo2 className="h-4 w-4" aria-hidden="true" />
                Cancelar divisão
              </Button>
            )}
          </div>
          {erroTextos && (
            <Alert variant="erro">
              <AlertDescription>{erroTextos}</AlertDescription>
            </Alert>
          )}

          {dividindo && (
            <div className="rounded-md border border-cinza-200 bg-cinza-50 p-md">
              <p className="mb-sm text-corpo-pequeno text-cinza-600">
                Selecione os itens que saem desta linha e formam uma nova linha de proposta:
              </p>
              <div className="flex flex-col gap-xs">
                {itensDisponiveis.map((it) => (
                  <label key={it.itemId} className="flex items-center gap-sm text-corpo-pequeno text-cinza-800">
                    <Checkbox
                      checked={selecionadosParaDividir.has(it.itemId)}
                      onCheckedChange={(marcado) => toggleSelecaoDivisao(it.itemId, marcado)}
                    />
                    {it.nome}
                  </label>
                ))}
              </div>
              <div className="mt-sm flex flex-wrap gap-sm">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={confirmarDivisao}
                  disabled={
                    dividindoEmAndamento ||
                    selecionadosParaDividir.size === 0 ||
                    selecionadosParaDividir.size === itensDisponiveis.length
                  }
                >
                  {dividindoEmAndamento ? "Dividindo…" : "Criar nova linha com os selecionados"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDividindo(false);
                    setSelecionadosParaDividir(new Set());
                    setErroDivisao(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
              {erroDivisao && (
                <Alert variant="erro" className="mt-sm">
                  <AlertDescription>{erroDivisao}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="mt-auto border-t border-cinza-100 pt-md">
            {editandoValor ? (
              <div className="flex flex-wrap items-end gap-sm">
                <div className="w-36">
                  <Label htmlFor={`valor-${linha.id}`}>Valor (R$)</Label>
                  <Input
                    id={`valor-${linha.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    value={valorEmEdicao}
                    onChange={(e) => setValorEmEdicao(Number(e.target.value) || 0)}
                  />
                </div>
                <Button variant="primary" size="sm" onClick={confirmarOverride}>
                  Salvar valor
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditandoValor(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-sm">
                <p className="text-valor-destaque tabular-nums text-cinza-900">{formatarMoeda(valorAtual)}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setValorEmEdicao(valorAtual);
                    setEditandoValor(true);
                  }}
                >
                  Editar valor
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
