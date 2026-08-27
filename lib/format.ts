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

// Recebe o valor já em percentual (ex.: 43.9, não a fração 0.439 — ver
// `fracaoParaPercent` em `components/precificacao/formatoPercentual.ts`).
// Mesmo motivo de `formatarMoeda`: `.toFixed(1)` cru usa ponto decimal,
// inconsistente com `toLocaleString("pt-BR")` usado ao lado (Achado
// art-director — "43.9%" vs "R$ 2.541,20" na mesma região).
export function formatarPercentual(valorPercent: number): string {
  return `${valorPercent.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

// Task 4.6-4.7 (contrato .maestro/state/contracts/4.6-4.7.md) — máscaras
// mask-as-you-type para os campos de texto livre de `/perfil` (RF-31).
// Ambas extraem só os dígitos, truncam no máximo e reconstroem a máscara —
// por isso lidam igual com digitação tecla-a-tecla ou colar valor sujo.

export function formatarCnpj(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 14);
  if (digitos.length === 0) return "";

  let resultado = digitos.slice(0, 2);
  if (digitos.length > 2) resultado += "." + digitos.slice(2, 5);
  if (digitos.length > 5) resultado += "." + digitos.slice(5, 8);
  if (digitos.length > 8) resultado += "/" + digitos.slice(8, 12);
  if (digitos.length > 12) resultado += "-" + digitos.slice(12, 14);
  return resultado;
}

export function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length === 0) return "";

  const tamanhoDdd = Math.min(digitos.length, 2);
  const ddd = digitos.slice(0, tamanhoDdd);
  const resto = digitos.slice(2);
  if (resto.length === 0) return `(${ddd}`;

  let resultado = `(${ddd}) `;
  // 11 dígitos = celular (9 na frente do número), 10 = fixo.
  const tamanhoPrimeiroBloco = digitos.length > 10 ? 5 : 4;
  const primeiroBloco = resto.slice(0, tamanhoPrimeiroBloco);
  const segundoBloco = resto.slice(tamanhoPrimeiroBloco);
  resultado += primeiroBloco;
  if (segundoBloco.length > 0) resultado += "-" + segundoBloco;
  return resultado;
}
