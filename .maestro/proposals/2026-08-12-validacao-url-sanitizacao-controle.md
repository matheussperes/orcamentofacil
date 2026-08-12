# Proposta: checklist de sanitização de string do `security-auditor` deveria cobrir caracteres de controle, não só espaço em branco

**Origem**: Lote 3 (Precisão do motor), Task 3.13-catalogo-back — `.maestro/tmp/Security-Decline-Payload.md`, `docs/Lessons-Learned.md` (entrada 2026-08-12, Padrão 2).

## Achado

`ehCaminhoRelativoValido` (`lib/produto/acoes.ts`) validava uma URL/caminho vindo de input não confiável usando `valor.trim().toLowerCase()` antes de rejeitar esquemas absolutos (`http:`, `//`, etc). `trim()` remove espaço em branco só nas pontas da string. O parser WHATWG de URL, usado pelo navegador em qualquer sink real (`<img src>`, `new URL()`, `TextureLoader.load`), remove caracteres de controle C0 (tab, LF, CR, NUL) em **qualquer posição** da string antes de interpretar o esquema. Isso permite bypass: `"htt\tps://evil.com"` passa no validador do servidor como caminho relativo, mas o navegador resolve para `https://evil.com`.

O `security-auditor` pegou o caso porque comparou a validação do servidor com o comportamento real do parser WHATWG — não porque havia um item de checklist específico para isso.

## Por que é reutilizável

Todo projeto que aceita URL, caminho de arquivo ou qualquer string estruturada de input não confiável, e valida essa string no servidor antes de um sink que usa um parser de plataforma (navegador, SO, biblioteca de terceiros), está exposto à mesma classe de bug: o validador do servidor é mais rígido/menos rígido que o parser do consumidor final, e a diferença vira bypass. `.trim()` é a solução ingênua mais comum, e resolve só o caso óbvio.

## Mudança proposta

No checklist do `security-auditor` (ou no contrato de execução para qualquer task que valida string estruturada — URL, path, header), adicionar item explícito: "se a validação usa normalização de string (`trim`, `toLowerCase`, etc) antes de decidir aceitar/rejeitar, confirmar que a normalização cobre o mesmo conjunto de transformações que o parser do sink real aplica (parser WHATWG para URL — caracteres de controle em qualquer posição, não só espaço nas pontas)". Não é um caso específico de URL — é a categoria geral "validação de string desalinhada do parser do consumidor final".

## Aguardando decisão humana

Esta proposta não deve ser aplicada automaticamente ao plugin compartilhado. Fica registrada para avaliação.
