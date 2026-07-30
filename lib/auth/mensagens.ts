// Task 13.3a — tradução de mensagens de erro cruas do Supabase Auth para
// texto legível em pt-BR (Design-System Seção 11: "dizem o que aconteceu e
// o que fazer a seguir", nunca o erro técnico cru). Extraído como função
// pura (testável) em vez de inline em app/login|signup — mesmo padrão de
// `lib/auth/validacao.ts` e `lib/auth/rotas.ts`.

export function mensagemErroLogin(mensagemBruta: string): string {
  const m = mensagemBruta.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos. Verifique e tente de novo.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar — verifique o link que enviamos na sua caixa de entrada.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Muitas tentativas seguidas. Aguarde um instante e tente de novo.";
  }
  return "Não foi possível entrar. Verifique a conexão e tente de novo.";
}

export function mensagemErroSignup(mensagemBruta: string): string {
  const m = mensagemBruta.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) {
    return "Este e-mail já está cadastrado. Tente entrar ou recuperar sua senha.";
  }
  if (m.includes("password")) {
    return "Senha inválida — use pelo menos 8 caracteres.";
  }
  if (m.includes("email") && (m.includes("invalid") || m.includes("valid"))) {
    return "E-mail inválido. Verifique e tente de novo.";
  }
  return "Não foi possível criar sua conta. Verifique os dados e tente de novo.";
}
