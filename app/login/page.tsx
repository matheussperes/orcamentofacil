"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mensagemErroLogin } from "@/lib/auth/mensagens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Task 13.3a (contrato .maestro/tmp/13.3a-contract.md) — tela de login,
// construída direto em v3 (docs/Design-System.md Seção 2.9: painel
// esquerdo `marinho-900` com o lockup PNG oficial variante "fundo escuro",
// painel direito branco com o formulário). NÃO mexe no visual de nenhuma
// tela antiga — ver `tailwind.config.ts` para a decisão sobre os tokens
// `marinho`/`marca` (isolados do `accent` v2 já em uso pelas telas
// existentes).
//
// `useSearchParams` exige um limite de Suspense ao redor de quem o chama
// (senão o Next tenta prerenderizar a página inteira como estática e
// falha) — por isso o formulário fica num componente interno e o export
// default só monta o Suspense.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

// Client component: usa o Supabase browser client (lib/supabase/client.ts,
// já configurado na Task 11.1 — não criamos client novo).
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  // Estado inicial cobre o retorno de app/auth/confirm/route.ts quando o
  // link de confirmação de e-mail está inválido/expirado (?erro=confirmacao)
  // — ver Design-System Seção 11 (diz o que aconteceu + o que fazer).
  const [erro, setErro] = useState<string | null>(() =>
    searchParams.get("erro") === "confirmacao"
      ? "O link de confirmação do seu e-mail é inválido ou expirou. Peça um novo cadastro em “Criar conta”, ou tente entrar caso já tenha confirmado antes."
      : null
  );

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      // Nunca mostramos error.message cru (Design-System Seção 11) — ver
      // lib/auth/mensagens.ts para o mapeamento pt-BR.
      setErro(mensagemErroLogin(error.message));
      return;
    }

    // router.refresh() garante que o Server Component seguinte (e o
    // middleware, na próxima navegação) já enxerguem a sessão recém-criada.
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Painel de marca — Seção 2.9 ("fundo escuro"). Some abaixo de `md`
          (768px): nesse breakpoint o formulário ocupa a tela inteira, e o
          logo variante "fundo claro" (abaixo, no painel branco) assume o
          lugar dele — nunca ficam os dois visíveis ao mesmo tempo. */}
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
            Orçamentos rápidos. Decisões seguras.
          </p>
          <p className="mt-3 max-w-md text-corpo text-marinho-300">
            Monte ambientes, gere planos de corte, controle custos e
            apresente propostas profissionais com a sua marca.
          </p>
        </div>
        <p className="text-corpo-pequeno text-marinho-300">
          © {new Date().getFullYear()} OrçaFácil
        </p>
      </div>

      <div className="flex w-full items-center justify-center bg-cinza-0 p-xl md:w-1/2">
        <div className="w-full max-w-[400px]">
          <Image
            src="/logo/logo-light.png"
            alt="OrçaFácil"
            width={818}
            height={280}
            className="mb-xl h-10 w-auto md:hidden"
          />

          <h1 className="text-titulo-secao font-semibold text-cinza-900">
            Bem-vindo de volta
          </h1>
          <p className="mt-1 text-corpo text-cinza-500">
            Acesse sua conta para continuar.
          </p>

          <form className="mt-xl flex flex-col gap-md" onSubmit={handleSubmit} noValidate>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cinza-400" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-9"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cinza-400" />
                <Input
                  id="senha"
                  type={mostrarSenha ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="pl-9 pr-9"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cinza-400 hover:text-cinza-600"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
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
              {carregando ? "Entrando…" : "Entrar"}
            </Button>
          </form>

          <p className="mt-lg text-center text-corpo-pequeno text-cinza-500">
            Ainda não tem uma conta?{" "}
            <Link href="/signup" className="font-medium text-marca hover:text-marca-hover">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
