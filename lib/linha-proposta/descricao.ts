import { nomeDoItem, type ModuloOrcamento } from "@/lib/orcamento";

// Task 13.6a (contrato .maestro/tmp/13.6a-contract.md) — geração da
// "descrição pré-preenchida" de uma Linha de Proposta (contrato: "gerar
// automaticamente a partir dos itens da linha... Decisão de formato exato do
// texto é sua"). Função PURA e testável (sem I/O), consumida tanto no
// servidor (`carregar.ts`, ao criar a linha default) quanto no client
// (`PropostaLab.tsx`, ao criar uma linha nova por split).
//
// Formato escolhido: lista os NOMES dos itens (mesmo nome que aparece em
// `/ambientes`/Corte&Material), separados por vírgula, terminando em ponto —
// tom direto/operacional (Design-System.md Seção 11), sem adjetivação
// comercial ("ambiente completo com...", "sofisticado" etc.) — quem lapida o
// texto pra tom de venda final é o próprio usuário (a descrição É editável).
export function gerarDescricaoLinha(itens: ModuloOrcamento[]): string {
  if (itens.length === 0) return "";
  const nomes = itens.map(nomeDoItem);
  return `${nomes.join(", ")}.`;
}
