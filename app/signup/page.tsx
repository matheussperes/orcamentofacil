"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { mensagemErroSignup } from "@/lib/auth/mensagens";
import { senhaValida, senhasConferem, TAMANHO_MINIMO_SENHA } from "@/lib/auth/validacao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Task 13.3a (contrato .maestro/tmp/13.3a-contract.md) — tela de cadastro,
// v3 (mesmo painel marinho-900 + formulário branco do /login). Escopo de
// campos deliberadamente menor que o mockup completo
// (`docs/Imagem das Telas/Cadastro-Singup.png` mostra CNPJ, telefone,
// endereço, cidade/estado): o trigger de banco `handle_new_user` (Task
// 11.1) só lê `organizacao_nome` e `nome` de `raw_user_meta_data` — os
// outros campos do mockup não têm onde ser persistidos ainda (mudança de
// schema está fora do papel do Frontend Engineer). Só nome da marcenaria +
// nome da pessoa + e-mail + senha, como o contrato pediu.
export default function SignupPage() {
  const router = useRouter();
  const [nomeMarcenaria, setNomeMarcenaria] = useState("");
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Cobre o caso "confirmação de e-mail exigida" (ver handleSubmit) — troca
  // a tela pelo aviso "confira seu e-mail" em vez de redirecionar.
  const [confirmacaoEnviada, setConfirmacaoEnviada] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);

    if (!senhaValida(senha)) {
      setErro(`A senha precisa ter no mínimo ${TAMANHO_MINIMO_SENHA} caracteres.`);
      return;
    }
    if (!senhasConferem(senha, confirmacao)) {
      setErro("As senhas não coincidem. Confira e tente de novo.");
      return;
    }

    setCarregando(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          // Lidos pelo trigger `handle_new_user` (Task 11.1) para criar
          // `organizacao` + `perfil` automaticamente. Não criamos essas
          // linhas manualmente aqui — a RLS bloquearia antes da sessão
          // existir, e o trigger já faz isso no banco.
          organizacao_nome: nomeMarcenaria || undefined,
          nome: nomeCompleto || undefined,
        },
      },
    });
    setCarregando(false);

    if (error) {
      setErro(mensagemErroSignup(error.message));
      return;
    }

    // Dois casos intencionais (contrato 13.3a — não se sabe de antemão se o
    // projeto Supabase exige confirmação de e-mail):
    // 1) Confirmação DESLIGADA: `signUp` já devolve `data.session` populada
    //    (login automático) — redireciona direto pro Dashboard.
    // 2) Confirmação LIGADA: `data.session` vem `null` (usuário criado, mas
    //    sem sessão até clicar no link do e-mail) — mostramos a mensagem em
    //    vez de redirecionar (o middleware mandaria de volta pro /login de
    //    qualquer forma, por falta de sessão).
    if (data.session) {
      router.push("/");
      router.refresh();
    } else {
      setConfirmacaoEnviada(true);
    }
  }

  if (confirmacaoEnviada) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cinza-0 p-xl">
        <div className="w-full max-w-[400px] text-center">
          <Image
            src="/logo/logo-light.png"
            alt="OrçaFácil"
            width={818}
            height={280}
            className="mx-auto mb-xl h-10 w-auto"
          />
          <h1 className="text-titulo-secao font-semibold text-cinza-900">
            Confira seu e-mail
          </h1>
          <p className="mt-2 text-corpo text-cinza-500">
            Enviamos um link de confirmação para <strong>{email}</strong>. Abra
            o link para ativar sua conta e entrar.
          </p>
          <Link
            href="/login"
            className="mt-lg inline-block font-medium text-marca hover:text-marca-hover"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-marinho-900 p-2xl md:flex">
        <Image
          src="/logo/logo-dark.png"
          alt="OrçaFácil"
          width={413}
          height={147}
          className="h-12 w-auto"
          priority
        />
        <div>
          <p className="text-display font-bold text-cinza-0">
            Comece agora seu controle profissional de orçamentos.
          </p>
          <p className="mt-3 max-w-md text-corpo text-marinho-300">
            Crie sua conta, cadastre sua marcenaria e já comece a orçar com
            mais agilidade, precisão e segurança.
          </p>
        </div>
        <p className="text-corpo-pequeno text-marinho-300">
          © {new Date().getFullYear()} OrçaFácil
        </p>
      </div>

      <div className="flex w-full items-center justify-center bg-cinza-0 p-xl md:w-1/2">
        <div className="w-full max-w-[400px] py-xl">
          <Image
            src="/logo/logo-light.png"
            alt="OrçaFácil"
            width={818}
            height={280}
            className="mb-xl h-10 w-auto md:hidden"
          />

          <h1 className="text-titulo-secao font-semibold text-cinza-900">
            Crie sua conta
          </h1>
          <p className="mt-1 text-corpo text-cinza-500">
            Preencha os dados para criar sua marcenaria.
          </p>

          <form className="mt-xl flex flex-col gap-md" onSubmit={handleSubmit} noValidate>
            <div>
              <Label htmlFor="nomeMarcenaria">Nome da marcenaria / empresa</Label>
              <Input
                id="nomeMarcenaria"
                required
                placeholder="Ex.: Marcenaria Peres Ltda"
                value={nomeMarcenaria}
                onChange={(e) => setNomeMarcenaria(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="nomeCompleto">Seu nome completo</Label>
              <Input
                id="nomeCompleto"
                required
                placeholder="Ex.: Matheus Peres"
                value={nomeCompleto}
                onChange={(e) => setNomeCompleto(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                autoComplete="new-password"
                required
                placeholder={`Mínimo de ${TAMANHO_MINIMO_SENHA} caracteres`}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="confirmacao">Confirmar senha</Label>
              <Input
                id="confirmacao"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Repita a senha"
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
              />
            </div>

            {erro && (
              <Alert variant="erro">
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={carregando}
              className="mt-sm w-full bg-marca hover:bg-marca-hover active:bg-marca-active"
            >
              {carregando ? "Criando conta…" : "Criar conta e iniciar"}
            </Button>
          </form>

          <p className="mt-lg text-center text-corpo-pequeno text-cinza-500">
            Já tem uma conta?{" "}
            <Link href="/login" className="font-medium text-marca hover:text-marca-hover">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
