// Task 13.4 (contrato .maestro/tmp/13.4-contract.md) — helper de formatação
// compartilhado. `app/modulo/EditorItemNucleo.tsx` e `app/proposta/page.tsx`
// já tinham cada um sua própria função `moeda` local (mesmo `toLocaleString`)
// — esta task precisa da mesma formatação em `CorteMaterialLab`/extração
// texto-CSV e não duplica de novo; os dois arquivos antigos não foram
// retrofitados para importar daqui (fora de escopo desta task, mesmo
// espírito do retrofit documentado em Design-System.md Seção 1).
//
// Design-System.md Seção 3: "Números monetários/medidas usam tabular-nums
// sempre" — isso é responsabilidade da classe Tailwind no componente que
// exibe o texto, não desta função (que só formata o valor pt-BR/BRL).

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}
