"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, ImageOff, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeletorModoPrecificacao } from "@/components/precificacao/SeletorModoPrecificacao";
import { SeletorModoMontagem } from "@/components/precificacao/SeletorModoMontagem";
import {
  MIME_TYPES_LOGO_ACEITOS,
  obterUrlAssinadaLogoOrganizacao,
  uploadLogoOrganizacao,
} from "@/lib/organizacao/logo-storage";
import {
  MIME_TYPES_FOTO_ACEITOS,
  obterUrlAssinadaFotoPerfil,
  uploadFotoPerfil,
} from "@/lib/perfil/foto-storage";
import type { OrganizacaoCarregada, PerfilCarregado } from "@/lib/perfil/carregar";
import type { DadosOrganizacao, ResultadoSalvarOrganizacao } from "@/lib/organizacao/salvar";
import type { DadosPerfil, ResultadoSalvarPerfil } from "@/lib/perfil/salvar";
import type { ResultadoExcluirOrganizacao } from "@/lib/organizacao/excluir";
import type { ResultadoTrocaSenha } from "@/lib/auth/trocar-senha";
import { senhaValida, senhasConferem, TAMANHO_MINIMO_SENHA } from "@/lib/auth/validacao";
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

// Task 4.11-front (contrato .maestro/state/contracts/4.11-front.md) —
// réplica direta de `validarArquivoLogo`/`TAMANHO_MAXIMO_LOGO_BYTES` acima,
// mesmo limite (bucket `perfil-fotos`, Task 4.11-back) e mesmos mimes
// (`MIME_TYPES_FOTO_ACEITOS`).
const TAMANHO_MAXIMO_FOTO_BYTES = 2 * 1024 * 1024;

/** Validação pura (sem I/O), mesma regra do bucket `perfil-fotos`. */
export function validarArquivoFoto(arquivo: File): string | null {
  if (!MIME_TYPES_FOTO_ACEITOS.includes(arquivo.type)) {
    return "Formato de imagem não suportado. Use PNG, JPEG ou WEBP.";
  }
  if (arquivo.size > TAMANHO_MAXIMO_FOTO_BYTES) {
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
  /** `true` quando a página chegou com `?definirSenha=1` (usuário voltou do
   * link de confirmação por e-mail, `app/auth/confirm/route.ts`) — mostra o
   * formulário "Definir nova senha" dentro de `SecaoSeguranca`. */
  definirSenhaInicial: boolean;
  onSolicitarTrocaSenha: () => Promise<ResultadoTrocaSenha>;
  onDefinirNovaSenha: (novaSenha: string) => Promise<ResultadoTrocaSenha>;
  /** Task 4.15 — só o papel `admin` pode excluir a organização (Q-17). Isto
   * apenas ESCONDE a seção "Excluir conta" para vendedor/projetista; a
   * autorização de verdade é a primeira coisa que `excluirOrganizacao`
   * (`lib/organizacao/excluir.ts`) faz no servidor, não esta prop. */
  ehAdmin: boolean;
  onExcluirOrganizacao: () => Promise<ResultadoExcluirOrganizacao>;
}

const PRECIFICACAO_FALLBACK: ModoPrecificacao = { modo: "multiplicador", fator: 2 };
const MONTAGEM_FALLBACK: ModoMontagem = { modo: "percentual_material", percentual: 0.1 };

export function PerfilLab({
  organizacaoInicial,
  perfilInicial,
  onSalvarOrganizacao,
  onSalvarPerfil,
  definirSenhaInicial,
  onSolicitarTrocaSenha,
  onDefinirNovaSenha,
  ehAdmin,
  onExcluirOrganizacao,
}: PerfilLabProps) {
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

      <SecaoSeguranca
        email={perfilInicial.email}
        definirSenhaInicial={definirSenhaInicial}
        onSolicitarTrocaSenha={onSolicitarTrocaSenha}
        onDefinirNovaSenha={onDefinirNovaSenha}
      />

      {/* Sem `organizacaoInicial` não há nome para o campo de confirmação por
          digitação exigido pela 7.11 — e uma exclusão irreversível não pode
          cair num rótulo genérico. O cenário de borda (organização não
          resolvível) já mostra o estado de erro acima. */}
      {ehAdmin && organizacaoInicial && (
        <SecaoExcluirConta
          nomeOrganizacao={organizacaoInicial.nome}
          onExcluir={onExcluirOrganizacao}
        />
      )}
    </div>
  );
}

/** Task 4.15 — conferência do campo de digitação do Dialog de exclusão
 * (Design-System 7.11: "permanece `disabled` até o texto digitado bater
 * EXATAMENTE com o nome da organização"). Exportada e pura só para ser
 * testável sem montar o Dialog, mesmo motivo de `validarArquivoLogo` acima.
 *
 * `trim()` nas duas pontas é a única tolerância: espaço acidental no fim de um
 * nome digitado à mão não é o erro que este campo existe para impedir (clicar
 * sem ler é). Caixa e acentuação continuam tendo que bater — o ponto do reforço
 * é obrigar a LER e reproduzir o nome. */
export function confirmacaoExclusaoConfere(digitado: string, nomeOrganizacao: string): boolean {
  const alvo = nomeOrganizacao.trim();
  return alvo.length > 0 && digitado.trim() === alvo;
}

// Task 4.15 (Modelo-de-Dominio.md 7.3) — "excluir conta" apaga a ORGANIZAÇÃO
// inteira, de forma imediata e irreversível. Confirmação explícita em `Dialog`
// (nunca `window.confirm`).
//
// NÃO segue o padrão simples de `ExcluirGabaritoDialog`: o Design-System 7.11
// abre uma exceção nomeada só para este caso ("o caso de maior severidade, um
// passo a mais"), porque é a única operação multi-tenant e sem qualquer forma
// de desfazer do produto — nomear + "é irreversível" explicitamente NÃO basta
// aqui. Os três reforços exigidos pela 7.11, e o motivo de cada um:
//   - campo de confirmação por digitação, sem placeholder pré-preenchido
//     (copiar/colar não pode ser mais fácil que digitar), com o botão
//     destrutivo `disabled` até bater exatamente;
//   - botão destrutivo SÓLIDO (`bg-erro text-cinza-0 hover:bg-erro/90`), não o
//     `danger` outline da 7.1 — que ficaria visualmente igual ao "Cancelar" ao
//     lado;
//   - rótulo explícito "Excluir organização", nunca "Excluir" sozinho.
// Este é o ÚNICO ponto do produto que usa o campo de digitação (7.11): não
// replique este tratamento em outra confirmação destrutiva.
//
// Só renderizada para `admin` (Q-17). Em caso de sucesso, manda o usuário para
// `/login` — o `perfil` e o login dele acabaram de deixar de existir, qualquer
// outra rota só renderizaria estado de erro.
function SecaoExcluirConta({
  nomeOrganizacao,
  onExcluir,
}: {
  nomeOrganizacao: string;
  onExcluir: () => Promise<ResultadoExcluirOrganizacao>;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmacao, setConfirmacao] = useState("");

  const podeExcluir = confirmacaoExclusaoConfere(confirmacao, nomeOrganizacao);

  async function confirmar() {
    // Cinto e suspensório: o botão já está `disabled`, mas a ação destrutiva
    // não depende disso para não rodar.
    if (!podeExcluir) return;

    setExcluindo(true);
    setErro(null);
    const resultado = await onExcluir();
    if (resultado.ok) {
      router.replace("/login");
      return;
    }
    setExcluindo(false);
    setErro(resultado.erro ?? "Não foi possível excluir a conta.");
  }

  return (
    <section className="rounded-lg border border-erro-border bg-cinza-0 p-xl shadow-xs">
      <div className="mb-md flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-erro" aria-hidden="true" />
        <h2 className="text-titulo-secao text-cinza-900">Excluir conta</h2>
      </div>

      <p className="mb-md text-corpo-pequeno text-cinza-800">
        Excluir a conta apaga a organização <strong>{nomeOrganizacao}</strong> inteira, para todos
        os usuários dela. Esta ação não pode ser desfeita.
      </p>

      <Dialog
        open={aberto}
        onOpenChange={(v) => {
          setAberto(v);
          // Fechar o diálogo zera a confirmação: reabrir sempre começa do
          // estado seguro, nunca com o botão destrutivo já liberado.
          if (!v) {
            setErro(null);
            setConfirmacao("");
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="danger">Excluir organização</Button>
        </DialogTrigger>
        <DialogContent tamanho="confirmacao">
          <DialogHeader>
            <DialogTitle>Excluir organização?</DialogTitle>
          </DialogHeader>
          <p className="text-corpo-pequeno text-cinza-800">
            Isso vai apagar permanentemente a organização <strong>{nomeOrganizacao}</strong> — todos
            os usuários, clientes, orçamentos, catálogo de produtos e gabaritos próprios. Esta ação
            não pode ser desfeita.
          </p>

          <div>
            <Label htmlFor="excluir-confirmacao">
              Digite <strong>{nomeOrganizacao}</strong> para confirmar
            </Label>
            <Input
              id="excluir-confirmacao"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="off"
              disabled={excluindo}
            />
          </div>

          {erro && (
            <Alert variant="erro">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAberto(false)} disabled={excluindo}>
              Cancelar
            </Button>
            {/* `variant="primary"` como base porque é o único sólido, com os
                estados de `disabled` da 7.1 já corretos; a cor é sobrescrita
                para `bg-erro` conforme a exceção da 7.11. */}
            <Button
              variant="primary"
              className="bg-erro hover:bg-erro/90 active:bg-erro/90"
              onClick={confirmar}
              disabled={excluindo || !podeExcluir}
            >
              {excluindo ? "Excluindo…" : "Excluir organização"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
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
  // `fotoPath` é o PATH persistido (Task 4.11-back) — o que vai pra
  // `onSalvar`. Campo novo (nunca existiu como texto livre), então sem
  // fallback de valor legado (diferente de `logoPath` em `SecaoOrganizacao`).
  const [fotoPath, setFotoPath] = useState(perfilInicial.fotoUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewComErro, setPreviewComErro] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelado = false;
    setPreviewComErro(false);
    if (!fotoPath) {
      setPreviewUrl(null);
      return;
    }
    obterUrlAssinadaFotoPerfil(fotoPath).then((url) => {
      if (cancelado) return;
      setPreviewUrl(url);
    });
    return () => {
      cancelado = true;
    };
  }, [fotoPath]);

  async function handleSelecionarFoto(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    const erroValidacao = validarArquivoFoto(arquivo);
    if (erroValidacao) {
      setErroFoto(erroValidacao);
      return;
    }
    setErroFoto(null);
    setEnviandoFoto(true);
    const resultado = await uploadFotoPerfil(perfilInicial.id, arquivo);
    setEnviandoFoto(false);
    if (resultado.ok) {
      setFotoPath(resultado.path);
    } else {
      setErroFoto(resultado.erro);
    }
  }

  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoSalvarPerfil | null>(null);

  async function handleSalvar() {
    setSalvando(true);
    setResultado(null);
    const resposta = await onSalvar({ nome, telefone, fotoUrl: fotoPath });
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

        <div className="flex flex-col gap-md sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="perfil-foto">Foto de perfil</Label>
            <input
              id="perfil-foto"
              ref={inputFotoRef}
              type="file"
              accept={MIME_TYPES_FOTO_ACEITOS.join(",")}
              className="hidden"
              onChange={handleSelecionarFoto}
              disabled={enviandoFoto}
            />
            <div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => inputFotoRef.current?.click()}
                disabled={enviandoFoto}
              >
                {enviandoFoto ? "Enviando…" : "Selecionar arquivo"}
              </Button>
            </div>
            <p className="mt-1 text-corpo-pequeno text-cinza-500">PNG, JPEG ou WEBP, até 2 MB.</p>
          </div>
          <div>
            <Label>Pré-visualização</Label>
            {previewUrl && !previewComErro ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL (privada), sem domínio pré-configurado em next.config.js.
              <img
                src={previewUrl}
                alt="Pré-visualização da foto de perfil"
                className="h-9 w-9 rounded-full border border-cinza-200 bg-cinza-0 object-cover"
                onError={() => setPreviewComErro(true)}
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cinza-200 bg-cinza-100">
                <ImageOff className="h-4 w-4 text-cinza-300" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>
        {erroFoto && (
          <Alert variant="erro">
            <AlertDescription>{erroFoto}</AlertDescription>
          </Alert>
        )}
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

// Task 4.12-4.13-front (RF-31) — terceira seção de `/perfil`, mesmo padrão
// visual de `SecaoOrganizacao`/`SecaoPerfilPessoal` (card com ícone + título
// + `p-xl`). E-mail (identidade de conta) mora aqui, não em "Perfil
// pessoal" — mesmo raciocínio do item 4.14 do Backlog. As duas ações
// (solicitar troca de senha / definir nova senha) usam as Server Actions já
// auditadas em `lib/auth/trocar-senha.ts` (Task 4.12-4.13 back); nenhuma
// lógica de autenticação nova aqui, só UI + validação client-side reaproveitada
// de `lib/auth/validacao.ts` (mesmo padrão de `app/signup/page.tsx`).
function SecaoSeguranca({
  email,
  definirSenhaInicial,
  onSolicitarTrocaSenha,
  onDefinirNovaSenha,
}: {
  email: string;
  definirSenhaInicial: boolean;
  onSolicitarTrocaSenha: () => Promise<ResultadoTrocaSenha>;
  onDefinirNovaSenha: (novaSenha: string) => Promise<ResultadoTrocaSenha>;
}) {
  const router = useRouter();

  const [solicitando, setSolicitando] = useState(false);
  const [resultadoSolicitacao, setResultadoSolicitacao] = useState<ResultadoTrocaSenha | null>(null);

  async function handleSolicitarTrocaSenha() {
    setSolicitando(true);
    setResultadoSolicitacao(null);
    const resposta = await onSolicitarTrocaSenha();
    setSolicitando(false);
    setResultadoSolicitacao(resposta);
  }

  // `definirSenhaInicial` só controla a EXIBIÇÃO inicial do formulário —
  // depois de definir a senha com sucesso ele é escondido (via `concluido`),
  // sem depender de reler a URL.
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoSenha, setConfirmacaoSenha] = useState("");
  const [definindoSenha, setDefinindoSenha] = useState(false);
  const [resultadoDefinicao, setResultadoDefinicao] = useState<ResultadoTrocaSenha | null>(null);
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  async function handleDefinirNovaSenha() {
    setErroValidacao(null);
    setResultadoDefinicao(null);

    if (!senhaValida(novaSenha)) {
      setErroValidacao(`A senha precisa ter no mínimo ${TAMANHO_MINIMO_SENHA} caracteres.`);
      return;
    }
    if (!senhasConferem(novaSenha, confirmacaoSenha)) {
      setErroValidacao("As senhas não coincidem. Confira e tente de novo.");
      return;
    }

    setDefinindoSenha(true);
    const resposta = await onDefinirNovaSenha(novaSenha);
    setDefinindoSenha(false);
    setResultadoDefinicao(resposta);
    if (resposta.ok) {
      // Remove `?definirSenha=1` da URL — evita reabrir o formulário num F5
      // depois que a senha já foi definida (decisão do executor, contrato
      // deixava o mecanismo exato a critério).
      router.replace("/perfil");
    }
  }

  return (
    <section className="rounded-lg border border-cinza-200 bg-cinza-0 p-xl shadow-xs">
      <div className="mb-md flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-cinza-500" aria-hidden="true" />
        <h2 className="text-titulo-secao text-cinza-900">Segurança</h2>
      </div>

      <div className="flex flex-col gap-md">
        <div className="sm:max-w-sm">
          <Label htmlFor="seguranca-email">E-mail</Label>
          <Input id="seguranca-email" value={email} disabled readOnly />
          <p className="mt-1 text-corpo-pequeno text-cinza-500">
            Trocar o e-mail de acesso não está disponível nesta versão.
          </p>
        </div>

        <div>
          <Button type="button" variant="ghost" onClick={handleSolicitarTrocaSenha} disabled={solicitando}>
            {solicitando ? "Enviando…" : "Trocar senha"}
          </Button>
          {resultadoSolicitacao && (
            <Alert variant={resultadoSolicitacao.ok ? "sucesso" : "erro"} className="mt-sm">
              <AlertDescription>
                {resultadoSolicitacao.ok
                  ? "Enviamos um link de confirmação para o seu e-mail. Clique nele para definir uma nova senha."
                  : (resultadoSolicitacao.erro ?? "Não foi possível enviar o link de troca de senha.")}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {definirSenhaInicial && !resultadoDefinicao?.ok && (
          <div className="border-t border-cinza-200 pt-md">
            <h3 className="mb-sm text-titulo-card text-cinza-900">Definir nova senha</h3>
            <div className="grid grid-cols-1 gap-md sm:max-w-sm">
              <div>
                <Label htmlFor="seguranca-nova-senha">Nova senha</Label>
                <Input
                  id="seguranca-nova-senha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder={`Mínimo de ${TAMANHO_MINIMO_SENHA} caracteres`}
                />
              </div>
              <div>
                <Label htmlFor="seguranca-confirmacao-senha">Confirmar nova senha</Label>
                <Input
                  id="seguranca-confirmacao-senha"
                  type="password"
                  value={confirmacaoSenha}
                  onChange={(e) => setConfirmacaoSenha(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-md flex flex-col items-start gap-sm">
              <Button variant="primary" onClick={handleDefinirNovaSenha} disabled={definindoSenha}>
                {definindoSenha ? "Salvando…" : "Salvar nova senha"}
              </Button>
              {erroValidacao && (
                <Alert variant="erro" className="w-full">
                  <AlertDescription>{erroValidacao}</AlertDescription>
                </Alert>
              )}
              {resultadoDefinicao && (
                <Alert variant={resultadoDefinicao.ok ? "sucesso" : "erro"} className="w-full">
                  <AlertDescription>
                    {resultadoDefinicao.ok
                      ? "Senha atualizada com sucesso."
                      : (resultadoDefinicao.erro ?? "Não foi possível atualizar a senha.")}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
