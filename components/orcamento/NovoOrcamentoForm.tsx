"use client";

import { useState, type FormEvent } from "react";
import { criarOrcamento } from "@/lib/orcamento/criar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Task 13.3c (contrato .maestro/tmp/13.3c-contract.md) — formulário de novo
// orçamento (Design-System Seção 7.9). Formulário controlado (useState),
// mesmo padrão de `/signup` (Task 13.3a): validação client-side (nome
// obrigatório) antes de chamar o Server Action; erro do Supabase vira
// mensagem legível (nunca a mensagem crua do Postgres/PostgREST, Design-
// System Seção 11).
//
// Decisão de escopo (contrato, "fora de escopo — documente"): seleção de
// cliente EXISTENTE não existe nesta task — todo envio cria um cliente novo,
// mesmo que já exista um com o mesmo nome na organização. Repetido aqui na
// UI (texto de apoio abaixo do título) para o usuário não esperar esse
// comportamento.

export interface NovoOrcamentoFormProps {
  /**
   * Harness `/dev/preview/orcamento/novo` (Task 13.3c): valida os campos e
   * mostra o resultado sem chamar o Server Action de verdade — o preview
   * não tem sessão/Supabase reais. O fluxo de escrita (criação real de
   * cliente + orçamento) só é testável pelo operador, com login de verdade;
   * ver relatório da task.
   */
  modoPreview?: boolean;
}

export function NovoOrcamentoForm({ modoPreview = false }: NovoOrcamentoFormProps) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [prazoEntrega, setPrazoEntrega] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [previewOk, setPreviewOk] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setPreviewOk(false);

    if (!nome.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }

    if (modoPreview) {
      setPreviewOk(true);
      return;
    }

    setCarregando(true);
    // Nunca envolver esta chamada em try/catch: em caso de sucesso,
    // `criarOrcamento` chama `redirect()` (Next.js lança um erro especial
    // para navegar) — um catch aqui engoliria esse throw e quebraria o
    // redirecionamento. Em erro, a função retorna `{ erro }` normalmente.
    const resultado = await criarOrcamento({
      nomeCliente: nome,
      telefone,
      endereco,
      prazoEntrega,
    });
    setCarregando(false);
    if (resultado?.erro) {
      setErro(resultado.erro);
    }
  }

  return (
    <div className="max-w-xl rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      <p className="text-corpo text-cinza-500">
        Cadastre o cliente para iniciar um novo orçamento. A seleção de um cliente já
        existente não está disponível nesta versão — cada orçamento novo cria um
        cliente novo.
      </p>

      <form className="mt-xl flex flex-col gap-md" onSubmit={handleSubmit} noValidate>
        <div>
          <Label htmlFor="cliente-nome">Nome do cliente *</Label>
          <Input
            id="cliente-nome"
            required
            placeholder="Ex.: Ana Paula Ribeiro"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="cliente-telefone">Telefone</Label>
          <Input
            id="cliente-telefone"
            placeholder="Ex.: (11) 91234-5678"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="cliente-endereco">Endereço</Label>
          <Input
            id="cliente-endereco"
            placeholder="Ex.: Rua das Flores, 123"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="prazo-entrega">Prazo de entrega</Label>
          <Input
            id="prazo-entrega"
            placeholder="Ex.: 30 dias"
            value={prazoEntrega}
            onChange={(e) => setPrazoEntrega(e.target.value)}
          />
        </div>

        {erro && (
          <Alert variant="erro">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {previewOk && (
          <Alert variant="sucesso">
            <AlertDescription>
              Pré-visualização: dados válidos. O envio real está desabilitado neste
              harness (sem sessão/Supabase).
            </AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={carregando} className="mt-sm">
          {carregando ? "Criando orçamento…" : "Criar orçamento"}
        </Button>
      </form>
    </div>
  );
}
