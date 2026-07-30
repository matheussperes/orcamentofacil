// Task 13.3a — validação client-side de `/signup`, extraída em funções
// puras para poder ser testada com Vitest (o repo não tem infra de
// renderização de componentes — sem jsdom/@testing-library — então lógica
// de formulário fica em módulos separados e testáveis, seguindo o mesmo
// padrão das funções puras de `lib/engine/*`).

/** Mínimo de 8 caracteres — mesma regra comunicada no mockup de cadastro. */
export const TAMANHO_MINIMO_SENHA = 8;

export function senhaValida(senha: string): boolean {
  return senha.length >= TAMANHO_MINIMO_SENHA;
}

export function senhasConferem(senha: string, confirmacao: string): boolean {
  return senha.length > 0 && senha === confirmacao;
}
