# Security Decline Payload

**Task**: 3.13-catalogo-back
**Branch**: feature/3.13-catalogo-back (commit 5e86dea)
**Data**: 2026-08-11
**Veredicto**: REPROVADO

## 1. Anti-hotlink contornável por caractere de controle no meio do esquema

- **Severidade**: Alto
- **Categoria**: OWASP:Validação de entrada (bypass de filtro de URL)
- **Arquivo e linha**: `lib/produto/acoes.ts:39-50` (`ehCaminhoRelativoValido`), aplicado em `lib/produto/acoes.ts:66-71`
- **Trecho**:
  ```ts
  function ehCaminhoRelativoValido(valor: string): boolean {
    const normalizado = valor.trim().toLowerCase();
    if (!normalizado) return true;
    if (normalizado.startsWith("//")) return false;
    if (/^[a-z][a-z0-9+.-]*:/.test(normalizado)) return false;
    return true;
  }
  ```
- **Risco concreto**: `trim()` só remove espaço em branco nas **pontas**. O parser
  de URL do navegador (WHATWG) remove tab/LF/CR em **qualquer posição** da
  string e descarta controles C0 no início. Consequência verificada por
  execução (Node, parser WHATWG, mesma regra dos navegadores):

  | valor gravado no banco (escapes JS) | `ehCaminhoRelativoValido` | resolvido pelo navegador |
  |---|---|---|
  | `"htt\tps://evil.com/x.png"` | **ACEITA** | `https://evil.com/x.png` |
  | `"http\ns://evil.com/x.png"` | **ACEITA** | `https://evil.com/x.png` |
  | `"h\rttps://evil.com/x.png"` | **ACEITA** | `https://evil.com/x.png` |
  | `"\u0000https://evil.com/x.png"` | **ACEITA** | `https://evil.com/x.png` |
  | `"ja\tvascript:alert(1)"` | **ACEITA** | `javascript:alert(1)` |

  Um usuário autenticado de qualquer organização chama `criarProduto` /
  `atualizarProduto` (server actions; `especificacao` é `Record<string,
  unknown>` vindo do cliente) com `texturaUrl = "htt\tps://evil.com/x.png"`.
  O valor **passa** pela validação e é persistido como se fosse um caminho
  relativo confiável. Quando a Task 3.13 (catálogo-front) entregar esse valor a
  um sink de URL — `<img src>`, `TextureLoader.load`, `new URL(valor, base)` —
  o navegador resolve para o domínio de terceiro: hotlink de conteúdo externo
  dentro do canvas de todos os usuários da organização, exatamente o cenário que
  Modelo-de-Dominio.md 4.1.1 regra 2 manda bloquear. Também vaza referer/IP dos
  visualizadores para o domínio do atacante e permite trocar a imagem servida a
  posteriori.

  O achado é bloqueante mesmo sem o consumidor existir hoje: o dado envenenado
  fica gravado *agora*, com o carimbo de "validado", e a task de front vai
  confiar nesse contrato. Corrigir depois exige limpar a base, não só o código.
  O comentário acima da função afirma cobrir "espaço/tab antes do protocolo" —
  a afirmação vale só para o tab no início, e o teste
  `lib/produto/acoes.test.ts:113-125` exercita apenas essa variante fácil.
- **Correção esperada**: normalizar removendo **todos** os controles C0 e o
  espaço em toda a string, não só nas pontas. Uma linha:
  ```ts
  const normalizado = valor.replace(/[\u0000-\u0020\u007f]/g, "").toLowerCase();
  ```
  (os dois testes seguintes da função ficam iguais). Acrescentar caso de teste
  com `"htt\tps://evil.com/x.png"` e `"\u0000https://evil.com/x.png"` — os dois
  passam hoje. Ajustar o comentário da função para descrever o que ele de fato
  cobre. Barato e na mesma linha: rejeitar segmento `..` (ver observação 1).
- **Responsável**: backend-engineer

## Observações fora do escopo da task

1. **Path traversal em `texturaUrl` (Observação, não bloqueia)** —
   `"../../../object/public/outro/x.png"` é aceito e, concatenado por
   `getPublicUrl`, o navegador normaliza para
   `https://<proj>.supabase.co/storage/v1/object/public/outro/x.png`, saindo do
   prefixo do bucket `texturas`. Não é explorável hoje: `texturas` é o único
   bucket público e `linha-proposta-renders` é privado (o endpoint `/public/`
   não o serve). Vira risco real no dia em que existir um segundo bucket público
   com conteúdo por-tenant. Custa nada blindar junto com o achado 1.
2. **`create policy` sem `drop policy if exists`** em
   `supabase/migrations/20260811110000_storage_texturas.sql:52` — o `insert into
   storage.buckets` é idempotente (`on conflict do update`), a policy não é.
   Re-execução da migration falha. Convenção/DX, não segurança; mesmo padrão do
   bucket irmão. Registro só para o Maestro decidir.
