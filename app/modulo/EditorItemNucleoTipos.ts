// Task R.3c — tipos e constantes compartilhados entre o hook de estado e os
// painéis de apresentação de `EditorItemNucleo` (extraídos sem mudança de
// comportamento).

export interface ResultadoSalvarItem {
  ok: boolean;
  /** Mensagem legível (Design-System Seção 11) — só presente quando `ok` é
   * `false`. */
  erro?: string;
  /** Mensagem de SUCESSO customizada (Design-System Seção 11) — quando
   * ausente e `ok` é `true`, o rodapé mostra "Salvo com sucesso." (Task
   * 13.3e, comportamento padrão). Usada por `/modulo` (Task 13.7c) para
   * avisar quando "Salvar" bifurcou (fork) um gabarito global em uma cópia
   * própria (D-15) — ver `onSalvarBox` em `app/modulo/page.tsx`. */
  mensagem?: string;
}

export interface DivisaoSel {
  parentId: string;
  indice: number;
}

export type Secao = "caixa" | "divisoes" | "portas" | "gavetas" | "puxador";

export const ORDEM_SECOES: Secao[] = ["caixa", "divisoes", "portas", "gavetas", "puxador"];

// Task 7.1 — rótulos do Stepper (Design-System Seção 6.5), na mesma ordem de
// ORDEM_SECOES. Mesmo texto usado no `titulo` de cada SecaoHeader.
export const ROTULOS_SECOES: Record<Secao, string> = {
  caixa: "Caixa",
  divisoes: "Divisões",
  portas: "Portas",
  gavetas: "Gavetas",
  puxador: "Puxador",
};
