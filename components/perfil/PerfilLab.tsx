"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Building2, ImageOff, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeletorModoPrecificacao } from "@/components/precificacao/SeletorModoPrecificacao";
import { SeletorModoMontagem } from "@/components/precificacao/SeletorModoMontagem";
import {
  MIME_TYPES_LOGO_ACEITOS,
  obterUrlAssinadaLogoOrganizacao,
  uploadLogoOrganizacao,
} from "@/lib/organizacao/logo-storage";
import type { OrganizacaoCarregada, PerfilCarregado } from "@/lib/perfil/carregar";
import type { DadosOrganizacao, ResultadoSalvarOrganizacao } from "@/lib/organizacao/salvar";
import type { DadosPerfil, ResultadoSalvarPerfil } from "@/lib/perfil/salvar";
import type { ModoMontagem, ModoPrecificacao } from "@/lib/engine/precificacao";
import { formatarCnpj, formatarTelefone } from "@/lib/format";

// Task 4.8-4.9-front (contrato .maestro/state/contracts/4.8-4.9-front.md) —
// limite de tamanho replicado do `file_size_limit` do bucket
// `organizacao-logos` (migration `20260812130418_storage_organizacao_logos.sql`,
// 2097152 bytes) — checado no client ANTES do upload pra evitar round-trip
// desnecessário quando o arquivo já é rejeitável de cara.
const TAMANHO_MAXIMO_LOGO_BYTES = 2 * 1024 * 1024;

/** Validação pura (sem I/O) pra ser testável sem mockar Supabase — mesma
 * regra que o bucket aplica (mime + tamanho), checada aqui primeiro. */
export function validarArquivoLogo(arquivo: File): string | null {
  if (!MIME_TYPES_LOGO_ACEITOS.includes(arquivo.type)) {
    return "Formato de imagem não suportado. Use PNG, JPEG ou WEBP.";
  }
  if (arquivo.size > TAMANHO_MAXIMO_LOGO_BYTES) {
    return "Arquivo muito grande. O tamanho máximo é 2 MB.";
  }
  return null;
}

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
// Task 4.8-4.9-front: campo "Logo (URL da imagem)" (texto livre) substituído
// por upload real (RF-31) — ver `MIME_TYPES_LOGO_ACEITOS`/`uploadLogoOrganizacao`/
// `obterUrlAssinadaLogoOrganizacao` em `lib/organizacao/logo-storage.ts`
// (bucket privado, Task 4.8-4.9-back). Preview continua via `<img>` nativo
// (não `next/image` — a signed URL é temporária e `next.config.js` não tem
// domínio liberado em `images.remotePatterns`). `logoPath` pode chegar como
// valor LEGADO (URL externa de antes desta task) — ver `useEffect` de
// resolução da preview logo abaixo, que cobre esse fallback sem exigir
// migração de dado.
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
  // `logoPath` é o PATH persistido (Task 4.8-4.9-back) — o que vai pra
  // `onSalvar`. Pode chegar como valor legado (URL externa de texto livre,
  // versão anterior a esta task); `previewUrl` é sempre resolvido pra
  // EXIBIÇÃO (signed URL do path, ou o próprio legado como fallback).
  const [logoPath, setLogoPath] = useState(organizacaoInicial.logoUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewComErro, setPreviewComErro] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const [erroLogo, setErroLogo] = useState<string | null>(null);
  const inputLogoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelado = false;
    setPreviewComErro(false);
    if (!logoPath) {
      setPreviewUrl(null);
      return;
    }
    obterUrlAssinadaLogoOrganizacao(logoPath).then((url) => {
      if (cancelado) return;
      // `url` null = path não existe no bucket (típico de valor legado que
      // era URL externa) — cai pro fallback de tentar `logoPath` direto
      // como `<img src>`; se isso também falhar, o `onError` da imagem
      // aciona o placeholder.
      setPreviewUrl(url ?? logoPath);
    });
    return () => {
      cancelado = true;
    };
  }, [logoPath]);

  async function handleSelecionarLogo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    const erroValidacao = validarArquivoLogo(arquivo);
    if (erroValidacao) {
      setErroLogo(erroValidacao);
      return;
    }
    setErroLogo(null);
    setEnviandoLogo(true);
    const resultado = await uploadLogoOrganizacao(organizacaoInicial.id, arquivo);
    setEnviandoLogo(false);
    if (resultado.ok) {
      setLogoPath(resultado.path);
    } else {
      setErroLogo(resultado.erro);
    }
  }

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
      logoUrl: logoPath,
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
            <Input id="org-cnpj" value={cnpj} onChange={(e) => setCnpj(formatarCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <Label htmlFor="org-telefone">Telefone</Label>
            <Input
              id="org-telefone"
              value={telefone}
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
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
            <Label htmlFor="org-logo">Logo</Label>
            <input
              id="org-logo"
              ref={inputLogoRef}
              type="file"
              accept={MIME_TYPES_LOGO_ACEITOS.join(",")}
              className="hidden"
              onChange={handleSelecionarLogo}
              disabled={enviandoLogo}
            />
            <div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => inputLogoRef.current?.click()}
                disabled={enviandoLogo}
              >
                {enviandoLogo ? "Enviando…" : "Selecionar arquivo"}
              </Button>
            </div>
            <p className="mt-1 text-corpo-pequeno text-cinza-500">PNG, JPEG ou WEBP, até 2 MB.</p>
          </div>
          <div>
            <Label>Pré-visualização</Label>
            {previewUrl && !previewComErro ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL (privada) ou fallback de URL legada, sem domínio pré-configurado em next.config.js.
              <img
                src={previewUrl}
                alt="Pré-visualização da logo da organização"
                className="h-9 w-16 rounded-sm border border-cinza-200 bg-cinza-0 object-contain"
                onError={() => setPreviewComErro(true)}
              />
            ) : (
              <div className="flex h-9 w-16 items-center justify-center rounded-sm border border-cinza-200 bg-cinza-100">
                <ImageOff className="h-4 w-4 text-cinza-300" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>
        {erroLogo && (
          <Alert variant="erro">
            <AlertDescription>{erroLogo}</AlertDescription>
          </Alert>
        )}

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
              onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
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
