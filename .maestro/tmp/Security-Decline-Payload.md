# Security Decline Payload

**Task**: 2.3-2.6
**Branch**: feature/2.3-2.6
**Data**: 2026-08-06
**Veredicto**: REPROVADO

## 1. Mutação cross-tenant via `salvarEstadoAmbiente` — `orcamentoId` do client nunca validado antes de INSERT

- **Severidade**: Crítico
- **Categoria**: OWASP: Controle de acesso (IDOR / cross-tenant write)
- **Arquivo e linha**: `lib/ambiente/salvar.ts:94-112` (insert de `ambiente`) e `lib/ambiente/salvar.ts:182-191` (insert de `elemento_continuo`)
- **Trecho**:
  ```ts
  let ambienteId = ambiente.id;
  if (!ambienteExistente) {
    const { data: novoAmbiente, error: erroCriarAmbiente } = await supabase
      .from("ambiente")
      .insert({
        organizacao_id: organizacaoId,
        orcamento_id: orcamentoId,       // <- vem do parâmetro da Server Action, nunca verificado contra organizacaoId
        nome: ambiente.nome,
        ordem: ambiente.ordem,
      })
      ...
  ```
  ```ts
  if (estado.elementosContinuos.length > 0) {
    const linhas = estado.elementosContinuos.map((elemento) =>
      linhaDeElementoContinuo({ organizacaoId, orcamentoId, elemento })  // mesmo orcamentoId não verificado
    );
    const { error: erroInsert } = await supabase.from("elemento_continuo").insert(linhas);
  ```
- **Risco concreto**: `salvarEstadoAmbiente` é uma Server Action (`"use server"`) — um endpoint HTTP invocável diretamente por qualquer usuário autenticado, com qualquer payload, independente do que a UI (`AmbientesTabConectada`) manda. Um usuário da organização A que obtenha (URL compartilhada, histórico do navegador, print, suporte) o `orcamentoId` de um orçamento da organização B pode chamar `salvarEstadoAmbiente(orcamentoIdDeB, estadoComAmbienteNovo)`. A função resolve corretamente `organizacaoId = A`, mas insere uma linha em `ambiente` com `organizacao_id = A` e `orcamento_id = <orçamento de B>` — a checagem de posse feita antes (`.eq("id", ambiente.id).eq("organizacao_id", organizacaoId)`) só decide UPDATE vs INSERT, nunca valida que o `orcamento_id` de destino pertence a A. Mesmo problema para `elemento_continuo`. Resultado: a organização A consegue pendurar dados em um orçamento que não é dela — escrita cross-tenant real, sem precisar ler nenhum dado de B (leitura continua corretamente isolada por RLS). Quando B excluir esse orçamento, o `on delete cascade` da FK apaga também as linhas plantadas por A, sem que B saiba que existiam nem que eram de outra organização. Esta task expandiu o mesmo gap (que já existia de forma restrita no caso de bootstrap de 1 ambiente) para rodar em laço a cada "Salvar alterações", cobrindo N ambientes/N paredes.
- **Correção esperada**: antes do laço `for (const ambiente of estado.ambientes)` em `salvarEstadoAmbiente`, confirmar que `orcamentoId` pertence a `organizacaoId` (mesmo padrão de `criarAmbiente` em `lib/ambiente/acoes.ts`: `select id from orcamento where id = orcamentoId and organizacao_id = organizacaoId`, aborta com erro "Este orçamento não existe mais." se não encontrar) antes de qualquer INSERT que referencie esse `orcamentoId`.
- **Responsável**: frontend-engineer

## Observações fora do escopo da task
- `linhaDeParede` (chamada em `salvar.ts`) grava `altura`/`largura`/`elementos`/`itens` vindos do client sem validar `altura > 0`/`largura > 0`, ao contrário de `criarParede`/`atualizarParede` em `acoes.ts`. Gap pré-existente (mesmo padrão já presente no código de 1 parede antes desta task) — registrar como possível task futura, não bloqueia esta.
