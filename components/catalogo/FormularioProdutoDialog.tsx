"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SeletorTexturaChapa } from "@/components/catalogo/SeletorTexturaChapa";
import type { DadosProduto, ResultadoProduto } from "@/lib/produto/acoes";
import {
  CODIGOS_FERRAGEM_FIXOS,
  nomeAmigavelFerragem,
  unidadePadraoFerragem,
  type EspecificacaoChapa,
  type EspecificacaoFerragem,
  type ProdutoRow,
  type TipoProduto,
} from "@/lib/produto/tipos";

// Task 4.1-4.3-4.5 (contrato .maestro/state/contracts/4.1-4.3-4.5.md) —
// substitui `FormularioChapaDialog`/`FormularioFerragemDialog`/
// `FormularioSimplesDialog` (3 componentes quase idênticos) por um único
// formulário com seletor de categoria INTERNO (RF-30), mesmo espírito de
// unificação que `FormularioSimplesDialog` já aplicava a fita/led/acessorio.
// Regra de negócio de cada categoria replicada, não reinventada — ver
// `montarEspecificacao`/`proximoNomeAoTrocarCodigoFerragem` abaixo, testadas
// em `FormularioProdutoDialog.test.ts`.

export const ROTULO_CATEGORIA: Record<TipoProduto, string> = {
  chapa: "Chapa",
  ferragem: "Ferragem",
  fita: "Fita de borda",
  led: "LED",
  acessorio: "Acessório",
};

const CATEGORIAS_ORDENADAS: TipoProduto[] = ["chapa", "ferragem", "fita", "led", "acessorio"];

/** Unidade fixa da categoria (não editável pelo usuário) — `null` quando o
 * tipo não tem unidade própria. Mesma regra de `TabelaSimples`/
 * `FormularioSimplesDialog` de antes desta task. */
export function unidadeDoTipo(tipo: TipoProduto): string | null {
  return tipo === "fita" ? "m" : null;
}

/** Unidade mostrada ao lado do campo de preço — cobre também o caso
 * ferragem, cuja unidade depende do código fixo escolhido. */
export function unidadePrecoParaExibicao(tipo: TipoProduto, codigoFerragem: string): string | null {
  if (tipo === "ferragem") return unidadePadraoFerragem(codigoFerragem);
  return unidadeDoTipo(tipo);
}

/** Decisão de escopo preservada de `FormularioFerragemDialog`: auto-preenche
 * o nome ao trocar o código SÓ quando o campo nome ainda está vazio ou ainda
 * é igual ao nome amigável do código anterior — preserva nome customizado. */
export function proximoNomeAoTrocarCodigoFerragem(nomeAtual: string, codigoAtual: string, novoCodigo: string): string {
  const nomeEhAutomatico = nomeAtual.trim() === "" || nomeAtual === nomeAmigavelFerragem(codigoAtual);
  return nomeEhAutomatico ? nomeAmigavelFerragem(novoCodigo) : nomeAtual;
}

export interface CamposCategoria {
  cor: string;
  espessura: number;
  texturaUrl: string | undefined;
  codigoFerragem: string;
}

/** `especificacao` por categoria — shape exato replicado dos 3 formulários
 * anteriores (fonte da verdade: `lib/produto/tipos.ts`). */
export function montarEspecificacao(tipo: TipoProduto, campos: CamposCategoria): Record<string, unknown> {
  if (tipo === "chapa") {
    return { cor: campos.cor, espessura: campos.espessura, texturaUrl: campos.texturaUrl };
  }
  if (tipo === "ferragem") {
    return { codigo: campos.codigoFerragem, unidade: unidadePadraoFerragem(campos.codigoFerragem) };
  }
  const unidade = unidadeDoTipo(tipo);
  return unidade ? { unidade } : {};
}

export interface FormularioProdutoDialogProps {
  trigger: ReactNode;
  produtoEmEdicao?: ProdutoRow;
  onSalvar: (dados: DadosProduto) => Promise<ResultadoProduto>;
  onSucesso: (produto: ProdutoRow) => void;
}

const CODIGO_FERRAGEM_PADRAO = CODIGOS_FERRAGEM_FIXOS[0] ?? "";

export function FormularioProdutoDialog({
  trigger,
  produtoEmEdicao,
  onSalvar,
  onSucesso,
}: FormularioProdutoDialogProps) {
  const categoriaTravada = Boolean(produtoEmEdicao);
  const especChapaEmEdicao = produtoEmEdicao?.especificacao as Partial<EspecificacaoChapa> | undefined;
  const especFerragemEmEdicao = produtoEmEdicao?.especificacao as Partial<EspecificacaoFerragem> | undefined;
  const codigoFerragemInicial = especFerragemEmEdicao?.codigo ?? CODIGO_FERRAGEM_PADRAO;

  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoProduto>(produtoEmEdicao?.tipo ?? "chapa");
  const [nome, setNome] = useState(produtoEmEdicao?.nome ?? "");
  const [codigo, setCodigo] = useState(produtoEmEdicao?.codigo ?? "");
  const [preco, setPreco] = useState(produtoEmEdicao?.preco ?? 0);
  const [cor, setCor] = useState(especChapaEmEdicao?.cor ?? "");
  const [espessura, setEspessura] = useState(especChapaEmEdicao?.espessura ?? 15);
  const [texturaUrl, setTexturaUrl] = useState<string | undefined>(especChapaEmEdicao?.texturaUrl);
  const [codigoFerragem, setCodigoFerragem] = useState(codigoFerragemInicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function resetar() {
    setTipo(produtoEmEdicao?.tipo ?? "chapa");
    setNome(produtoEmEdicao?.nome ?? "");
    setCodigo(produtoEmEdicao?.codigo ?? "");
    setPreco(produtoEmEdicao?.preco ?? 0);
    setCor(especChapaEmEdicao?.cor ?? "");
    setEspessura(especChapaEmEdicao?.espessura ?? 15);
    setTexturaUrl(especChapaEmEdicao?.texturaUrl);
    setCodigoFerragem(codigoFerragemInicial);
    setErro(null);
  }

  function trocarTipo(novoTipo: TipoProduto) {
    setTipo(novoTipo);
    setCor("");
    setEspessura(15);
    setTexturaUrl(undefined);
    setCodigoFerragem(CODIGO_FERRAGEM_PADRAO);
    if (novoTipo === "ferragem") {
      setNome((nomeAtual) => proximoNomeAoTrocarCodigoFerragem(nomeAtual, codigoFerragem, CODIGO_FERRAGEM_PADRAO));
    }
  }

  function trocarCodigoFerragem(novoCodigo: string) {
    setNome((nomeAtual) => proximoNomeAoTrocarCodigoFerragem(nomeAtual, codigoFerragem, novoCodigo));
    setCodigoFerragem(novoCodigo);
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const resultado = await onSalvar({
      tipo,
      nome,
      codigo: codigo.trim() || null,
      especificacao: montarEspecificacao(tipo, { cor, espessura, texturaUrl, codigoFerragem }),
      preco,
    });
    setSalvando(false);
    if (resultado.ok && resultado.produto) {
      onSucesso(resultado.produto);
      setAberto(false);
    } else {
      setErro(resultado.erro ?? "Não foi possível salvar o produto.");
    }
  }

  const unidadePreco = unidadePrecoParaExibicao(tipo, codigoFerragem);

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (v) resetar();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent tamanho="formulario">
        <DialogHeader>
          <DialogTitle>{produtoEmEdicao ? "Editar item" : "Adicionar item"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          <div>
            <Label htmlFor="produto-categoria">Categoria *</Label>
            <Select value={tipo} onValueChange={(v) => trocarTipo(v as TipoProduto)} disabled={categoriaTravada}>
              <SelectTrigger id="produto-categoria">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS_ORDENADAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {ROTULO_CATEGORIA[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoriaTravada && (
              <p className="mt-1 text-corpo-pequeno text-cinza-500">
                Categoria não pode ser alterada na edição.
              </p>
            )}
          </div>

          {tipo === "ferragem" ? (
            <div>
              <Label htmlFor="produto-codigo-ferragem">Código *</Label>
              <Select value={codigoFerragem} onValueChange={trocarCodigoFerragem}>
                <SelectTrigger id="produto-codigo-ferragem">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CODIGOS_FERRAGEM_FIXOS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {nomeAmigavelFerragem(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-corpo-pequeno text-cinza-500">
                Fixo — precisa bater com o item que o motor de cálculo gera.
              </p>
            </div>
          ) : null}

          <div>
            <Label htmlFor="produto-nome">Nome *</Label>
            <Input
              id="produto-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Branco TX 15mm"
            />
          </div>

          {tipo === "chapa" && (
            <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Label htmlFor="produto-cor">Cor *</Label>
                <Input
                  id="produto-cor"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  placeholder="Ex.: Branco TX"
                />
              </div>
              <div>
                <Label htmlFor="produto-espessura">Espessura (mm) *</Label>
                <Input
                  id="produto-espessura"
                  type="number"
                  min={1}
                  value={espessura}
                  onChange={(e) => setEspessura(Number(e.target.value) || 0)}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <div>
              <Label htmlFor="produto-codigo">Código (opcional)</Label>
              <Input
                id="produto-codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ex.: CHP-001"
              />
              <p className="mt-1 text-corpo-pequeno text-cinza-500">Uso interno, para busca rápida.</p>
            </div>
            <div className="w-40">
              <Label htmlFor="produto-preco">Preço{unidadePreco ? ` (${unidadePreco})` : " (R$)"} *</Label>
              <Input
                id="produto-preco"
                type="number"
                min={0}
                step="0.01"
                value={preco}
                onChange={(e) => setPreco(Number(e.target.value) || 0)}
              />
            </div>
          </div>

          {tipo === "chapa" && <SeletorTexturaChapa value={texturaUrl} onChange={setTexturaUrl} />}
        </div>

        {erro && (
          <Alert variant="erro">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setAberto(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
