"use client";

import { useState } from "react";
import { Building2, ImageOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeletorModoPrecificacao } from "@/components/precificacao/SeletorModoPrecificacao";
import { SeletorModoMontagem } from "@/components/precificacao/SeletorModoMontagem";
import type { OrganizacaoCarregada, PerfilCarregado } from "@/lib/perfil/carregar";
import type { DadosOrganizacao, ResultadoSalvarOrganizacao } from "@/lib/organizacao/salvar";
import type { DadosPerfil, ResultadoSalvarPerfil } from "@/lib/perfil/salvar";
import type { ModoMontagem, ModoPrecificacao } from "@/lib/engine/precificacao";

// Task 13.7a (contrato .maestro/tmp/13.7a-contract.md) — componente
// PRESENTACIONAL de `/perfil` (mesmo espírito de `FinanceiroLab`/
// `CorteMaterialLab`): recebe os dados já carregados pelo Server Component
// da rota e devolve mudanças via `onSalvarOrganizacao`/`onSalvarPerfil`, sem
// saber de Supabase — quem monta este componente decide o destino
// (`PerfilConectado`, real, ou o harness `/dev/preview/perfil`, no-op).
//
// Duas seções, DOIS botões "Salvar alterações" independentes (decisão do
// Frontend Engineer — o contrato deixava a critério, "documente"): a Task
// 13.7a mantém "Organização" e "Perfil pessoal" como dois formulários
// separados (tabelas diferentes, policies de RLS diferentes, ciclos de vida
// diferentes — mesmo raciocínio que já levou `AmbientesLab`/
// `CorteMaterialLab`/`FinanceiroLab` a terem cada um seu próprio botão de
// salvar isolado por aba). Um único botão "salvar tudo" exigiria coordenar
// duas chamadas de Server Action com resultados independentes na mesma UI
// de feedback, sem ganho real de simplicidade para o usuário.
//
// Decisão de escopo (contrato, "bônus simples, não obrigatório"): preview da
// logo a partir da URL digitada, via `<img>` nativo (não `next/image` — a
// URL é arbitrária, digitada pelo usuário, e `next.config.js` não tem
// domínio nenhum liberado em `images.remotePatterns`; exigiria o usuário
// pré-cadastrar domínios, o que não faz sentido para um campo de texto
// livre). Erro de carregamento da imagem (URL inválida/CORS/404) cai num
// placeholder neutro em vez de mostrar o ícone de imagem quebrada do
// navegador.
//
// Decisão de escopo (sem resposta explícita no contrato — documentada
// aqui): a lista "Conteúdo da página" do contrato NÃO inclui as alturas
// padrão das faixas (rodapé/bancada/aéreo/pé-direito), mesmo com o
// parágrafo de contexto do contrato mencionando que um SEGUNDO caminho de
// edição em `/perfil` seria tecnicamente seguro (mesma coluna
// `organizacao.alturas_padrao` que a aba Ambientes já grava). Optou-se por
// NÃO adicionar esses campos aqui: a seção "Conteúdo da página" (a lista
// concreta de campos da task) não os lista, e duplicar o input das alturas
// em duas telas sem pedido explícito arrisca description drift (rótulos/
// validação divergindo entre as duas cópias com o tempo). As alturas
// continuam editáveis exclusivamente pela aba Ambientes
// (`components/ambientes/AmbientesLab.tsx`), como já documentado lá.
export interface PerfilLabProps {
  /** `null` no cenário de borda descrito em `lib/perfil/carregar.ts`
   * (usuário sem organização resolvível) — a seção "Organização" vira um
   * estado de erro (Design-System.md Seção 8) em vez de formulário. */
  organizacaoInicial: OrganizacaoCarregada | null;
  perfilInicial: PerfilCarregado;
  onSalvarOrganizacao: (organizacaoId: string, dados: DadosOrganizacao) => Promise<ResultadoSalvarOrganizacao>;
  onSalvarPerfil: (dados: DadosPerfil) => Promise<ResultadoSalvarPerfil>;
}

const PRECIFICACAO_FALLBACK: ModoPrecificacao = { modo: "multiplicador", fator: 2 };
const MONTAGEM_FALLBACK: ModoMontagem = { modo: "percentual_material", percentual: 0.1 };

export function PerfilLab({ organizacaoInicial, perfilInicial, onSalvarOrganizacao, onSalvarPerfil }: PerfilLabProps) {
  return (
    <div className="flex flex-col gap-xl">
      {organizacaoInicial ? (
        <SecaoOrganizacao organizacaoInicial={organizacaoInicial} onSalvar={onSalvarOrganizacao} />
      ) : (
        <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
          <h2 className="mb-md text-titulo-secao text-cinza-900">Organização</h2>
          <Alert variant="erro">
            <AlertDescription>
              Não foi possível carregar os dados da sua organização. Atualize a página e tente
              novamente.
            </AlertDescription>
          </Alert>
        </section>
      )}

      <SecaoPerfilPessoal perfilInicial={perfilInicial} onSalvar={onSalvarPerfil} />
    </div>
  );
}

function SecaoOrganizacao({
  organizacaoInicial,
  onSalvar,
}: {
  organizacaoInicial: OrganizacaoCarregada;
  onSalvar: (organizacaoId: string, dados: DadosOrganizacao) => Promise<ResultadoSalvarOrganizacao>;
}) {
  const [nome, setNome] = useState(organizacaoInicial.nome);
  const [cnpj, setCnpj] = useState(organizacaoInicial.cnpj);
  const [endereco, setEndereco] = useState(organizacaoInicial.endereco);
  const [telefone, setTelefone] = useState(organizacaoInicial.telefone);
  const [logoUrl, setLogoUrl] = useState(organizacaoInicial.logoUrl);
  const [logoComErro, setLogoComErro] = useState(false);
  const [unidade, setUnidade] = useState<"mm" | "cm">(organizacaoInicial.unidade);
  const [precificacao, setPrecificacao] = useState<ModoPrecificacao>(
    organizacaoInicial.modoPrecificacaoPadrao ?? PRECIFICACAO_FALLBACK
  );
  const [montagem, setMontagem] = useState<ModoMontagem>(organizacaoInicial.modoMontagemPadrao ?? MONTAGEM_FALLBACK);
  // Task 4.16-back: kerf (`espessuraSerraPadraoMm`) não tem campo nesta tela
  // ainda (Task 4.16-front, fora de escopo aqui) — só precisa sobreviver ao
  // round-trip do "Salvar alterações" desta seção sem ser zerado.
  const espessuraSerraPadraoMm = organizacaoInicial.espessuraSerraPadraoMm;

  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoSalvarOrganizacao | null>(null);

  async function handleSalvar() {
    setSalvando(true);
    setResultado(null);
    const resposta = await onSalvar(organizacaoInicial.id, {
      nome,
      cnpj,
      endereco,
      telefone,
      logoUrl,
      unidade,
      modoPrecificacaoPadrao: precificacao,
      modoMontagemPadrao: montagem,
      espessuraSerraPadraoMm,
    });
    setSalvando(false);
    setResultado(resposta);
  }

  return (
    <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      <div className="mb-md flex items-center gap-2">
        <Building2 className="h-5 w-5 text-cinza-500" aria-hidden="true" />
        <h2 className="text-titulo-secao text-cinza-900">Organização</h2>
      </div>
      <p className="mb-md text-corpo-pequeno text-cinza-500">
        Esses dados aparecem no cabeçalho da proposta e definem os padrões usados em orçamentos
        novos.
      </p>

      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <Label htmlFor="org-nome">Nome da organização *</Label>
            <Input id="org-nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="org-cnpj">CNPJ</Label>
            <Input id="org-cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <Label htmlFor="org-telefone">Telefone</Label>
            <Input
              id="org-telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="Ex.: (11) 91234-5678"
            />
          </div>
          <div>
            <Label htmlFor="org-endereco">Endereço</Label>
            <Input id="org-endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-md sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="org-logo">Logo (URL da imagem)</Label>
            <Input
              id="org-logo"
              value={logoUrl}
              onChange={(e) => {
                setLogoUrl(e.target.value);
                setLogoComErro(false);
              }}
              placeholder="https://…"
            />
          </div>
          <div>
            <Label>Pré-visualização</Label>
            {logoUrl && !logoComErro ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL arbitrária digitada pelo usuário, sem domínio pré-configurado em next.config.js.
              <img
                src={logoUrl}
                alt="Pré-visualização da logo da organização"
                className="h-9 w-16 rounded-sm border border-cinza-200 bg-cinza-0 object-contain"
                onError={() => setLogoComErro(true)}
              />
            ) : (
              <div className="flex h-9 w-16 items-center justify-center rounded-sm border border-cinza-200 bg-cinza-100">
                <ImageOff className="h-4 w-4 text-cinza-300" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        <div className="w-40">
          <Label htmlFor="org-unidade">Unidade de medida</Label>
          <Select value={unidade} onValueChange={(v) => setUnidade(v === "cm" ? "cm" : "mm")}>
            <SelectTrigger id="org-unidade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mm">Milímetros (mm)</SelectItem>
              <SelectItem value="cm">Centímetros (cm)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <h3 className="mb-sm text-titulo-card text-cinza-900">Modo de precificação padrão</h3>
          <SeletorModoPrecificacao idPrefix="org-precificacao" valor={precificacao} onChange={setPrecificacao} />
        </div>

        <div>
          <h3 className="mb-sm text-titulo-card text-cinza-900">Modo de montagem padrão</h3>
          <SeletorModoMontagem idPrefix="org-montagem" valor={montagem} onChange={setMontagem} />
        </div>
      </div>

      <div className="mt-lg flex flex-col items-start gap-sm">
        <Button variant="primary" onClick={handleSalvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar alterações"}
        </Button>
        {resultado && (
          <Alert variant={resultado.ok ? "sucesso" : "erro"} className="w-full">
            <AlertDescription>
              {resultado.ok
                ? "Dados da organização salvos com sucesso."
                : (resultado.erro ?? "Não foi possível salvar os dados da organização.")}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </section>
  );
}

function SecaoPerfilPessoal({
  perfilInicial,
  onSalvar,
}: {
  perfilInicial: PerfilCarregado;
  onSalvar: (dados: DadosPerfil) => Promise<ResultadoSalvarPerfil>;
}) {
  const [nome, setNome] = useState(perfilInicial.nome);
  const [telefone, setTelefone] = useState(perfilInicial.telefone);

  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoSalvarPerfil | null>(null);

  async function handleSalvar() {
    setSalvando(true);
    setResultado(null);
    const resposta = await onSalvar({ nome, telefone });
    setSalvando(false);
    setResultado(resposta);
  }

  return (
    <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      <div className="mb-md flex items-center gap-2">
        <User className="h-5 w-5 text-cinza-500" aria-hidden="true" />
        <h2 className="text-titulo-secao text-cinza-900">Perfil pessoal</h2>
      </div>

      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <Label htmlFor="perfil-nome">Nome</Label>
            <Input id="perfil-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="perfil-telefone">Telefone</Label>
            <Input
              id="perfil-telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="Ex.: (11) 91234-5678"
            />
          </div>
        </div>

        <div className="sm:max-w-sm">
          <Label htmlFor="perfil-email">E-mail</Label>
          <Input id="perfil-email" value={perfilInicial.email} disabled readOnly />
          <p className="mt-1 text-corpo-pequeno text-cinza-500">
            Trocar o e-mail de acesso não está disponível nesta versão.
          </p>
        </div>
      </div>

      <div className="mt-lg flex flex-col items-start gap-sm">
        <Button variant="primary" onClick={handleSalvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar alterações"}
        </Button>
        {resultado && (
          <Alert variant={resultado.ok ? "sucesso" : "erro"} className="w-full">
            <AlertDescription>
              {resultado.ok
                ? "Dados de perfil salvos com sucesso."
                : (resultado.erro ?? "Não foi possível salvar seus dados de perfil.")}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </section>
  );
}
