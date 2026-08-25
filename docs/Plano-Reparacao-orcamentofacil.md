# Stage de Reparação — orcamentofacil

> Plano de execução para rodar no terminal, com o Claude Code, usando o plugin
> **maestro 3.9.0**. Nenhum arquivo do orcamentofacil foi alterado ao escrever
> este documento — tudo aqui é para você executar.
>
> **Ordem importa.** Cada etapa foi posicionada onde está por um motivo, e o
> motivo está escrito. Pular a R.2 para "ganhar tempo" é a única forma garantida
> de terminar com as mesmas telas.

---

## Antes de começar: o que mudou no plugin

| Novidade | Onde | O que faz |
|---|---|---|
| Doutrina de entrega | `doctrine/Padrao-de-Entrega.md` | Declara `rascunho` / `release` / `vitrine` e o preâmbulo que agora abre os 18 agentes |
| `art-director` | `agents/art-director.md` | Gate de **tela**, `opus`, veto sobre composição e identidade. Rubrica de 12 itens vetáveis |
| `Screen-Composition.md` | Modo novo do `product-designer` | O documento entre a prosa dos Blueprints e os tokens do Design System |
| Seção 0 — Direção de Arte | `product-designer` | Tese visual, decisão assinatura, tipografia justificada, antipadrões. Escrita **antes** de qualquer token |
| `/maestro-stage-close` | `commands/` | Fecha stage com seis critérios, não com "tasks mescladas" |
| `scan-legacy.mjs` | `scripts/` | Conta coexistência de padrões. No orcamentofacil hoje: **67 ocorrências em 13 arquivos**, mais 59 definições em `globals.css` |
| Regra do Raio da Tela | `frontend-engineer` | O domínio da task passa a ser a tela, não o arquivo |
| Task terminal de tela | `backlog-planner` | Toda tela ganha um dono do conjunto |
| Teto de arquivo | `code-auditor` | 400 linhas em arquivo de UI reprova |
| **3.9.1** — nove propostas | vários agentes | Investigação prévia antes do contrato, commits próprios antes de deletar branch, executor morto por limite de gasto, credencial nunca caçada, `GRANT` por coluna, parser do sink, duas localizações de status, reaproveitamento de `lib/`, posse de ID |

---

## R.0 — Preparação (você, 15 minutos, sem agente)

### R.0.1 Substitua o `.maestro/config.json`

O projeto está no **`schemaVersion` 2, framework 3.3.0** — cinco versões atrás do plugin. Ele nunca teve `gates.foreground`, `guards` nem `graph`: os hooks vinham funcionando pelos padrões embutidos nos próprios scripts, o que dá o mesmo resultado, mas por acidente e não por configuração. Não é caso de acrescentar blocos; é caso de substituir o arquivo.

O conteúdo abaixo já preserva tudo que era seu — `enginePath`, `sourcePath`, `migrationsPath`, os scripts reais e o caminho do cofre do Obsidian — e acrescenta o que faltava. Entregue junto deste plano como `config-orcamentofacil.json`; é só renomear para `config.json` e colocar em `.maestro/`.

```jsonc
{
  "schemaVersion": 5,
  "framework": { "plugin": "maestro", "version": "3.9.1" },

  "deliveryStandard": "release",
  "screenLevels": {
    "/login": "vitrine",
    "/signup": "vitrine",
    "/proposta/[id]/pdf": "vitrine"
  },

  "docs": {
    "prd": "docs/PRD.md",
    "blueprints": "docs/Mapa-de-Telas.md",      // <- o arquivo que existe de verdade
    "composition": "docs/Screen-Composition.md", // <- ainda não existe; R.2 cria
    "designSystem": "docs/Design-System.md",
    "domain": "docs/Modelo-de-Dominio.md",
    "businessStrategy": "docs/Business-Strategy.md",
    "backlog": "docs/Backlog.md",
    "status": "docs/Status.md",
    "lessons": "docs/Lessons-Learned.md"
  },

  "conventions": {
    "platforms": { "web": "ativo", "mobile": "nao_iniciado" },
    "mobileComponentLibrary": null,
    "legacyPatterns": [
      "legado-grid", "className=\"card", "className=\"campos",
      "className=\"acoes", "className=\"primary", "className=\"ghost\"",
      "className=\"danger", "--legacy-"
    ],
    "maxUiFileLines": 400,
    "enginePath": "engine",
    "sourcePath": "app",
    "migrationsPath": "supabase/migrations",
    "scripts": {
      "build": "npm run build", "lint": "npm run lint",
      "typecheck": "npm run typecheck", "test": "npm run test",
      "dev": "npm run dev", "seedQaUser": null
    },
    "breakpoints": { "mobile": 375, "tablet": 768, "desktop": 1440 },
    "mainBranch": "main"
  },

  "gates": {
    "maxAttemptsPerGate": 2,
    "uxAuditRequiresScreenshots": true,
    "artDirectorEnabled": true,
    "artAuditRequiresComposition": true,
    "maxScreensPerArtAudit": 2,
    "qaGateEnabled": true,
    "foreground": ["code-auditor", "security-auditor", "qa-engineer",
                   "spec-auditor", "memory-manager"]
  },

  "guards": {
    "blockMainThreadAppWrites": true,
    "appPaths": ["src", "lib", "app", "components", "pages",
                 "hooks", "styles", "supabase", "engine"]
  },

  "graph": {
    "enabled": true, "tool": "graphify", "outputDir": "graphify-out",
    "report": "graphify-out/GRAPH_REPORT.md", "data": "graphify-out/graph.json"
  },

  "obsidian": {
    "askOnRoundEnd": true, "useObsidianPlugin": true,
    "vaultPathFallback": "C:\\Users\\teteu\\iCloudDrive\\iCloud~md~obsidian\\Obsidian-Claude\\00 - Inbox",
    "notesSubfolder": "Maestro"
  }
}
```

Três linhas merecem atenção especial:

**`"blueprints": "docs/Mapa-de-Telas.md"`** — os agentes procuravam `docs/Screen-Blueprints.md`, que nunca existiu neste projeto. Telas foram construídas sem o documento de telas, e nada avisou. Esta linha fecha esse buraco.

**`"engine"` acrescentado a `guards.appPaths`** — o motor de cálculo mora lá e não estava protegido contra escrita vinda da thread principal.

**`"foreground"`** — nunca existiu no projeto. Sem ele os hooks caem no padrão embutido, que por acaso é a mesma lista; com ele, a política passa a ser sua e não do script.

### R.0.2 Meça o ponto de partida

```bash
node "<caminho-do-plugin>/scripts/scan-legacy.mjs"
find app components -name "*.tsx" | xargs wc -l | sort -rn | head -10
```

Guarde os dois números. São a linha de base contra a qual o stage fecha:

```
scan-legacy hoje         126 ocorrências totais:
                         67 consumidores em 13 arquivos .tsx
                         59 definições em app/globals.css (saem por último)
acima de 400 linhas      AmbientesLab 2250 · BoxCanvas 1086 · EditorItemNucleo 1003
                         PerfilLab 879 · CorteMaterialLab 643 · ElevacaoParede 560
                         PropostaLab 528
```

### R.0.3 Confirme que o plugin está em 3.9.1

```powershell
claude plugin details maestro@plugincode
```

Precisa dizer **3.9.1**, com **18 agentes** e `art-director` entre eles. Se disser 3.8.0, o `claude plugin update maestro@plugincode` não rodou ou a sessão não foi reiniciada — o plugin é copiado na instalação, não lido ao vivo da pasta.

### R.0.4 Abra o stage

```
Aja como o Maestro. Abra o Pipeline Stage "Reparação" no Backlog, com as tasks
R.1 a R.7 deste plano. Este stage precede qualquer feature nova — nenhuma task
de funcionalidade entra na fila antes do stage-close dele passar.
```

---

## R.1 — Direção de Arte (`product-designer`, 1 task)

**Primeiro de tudo, e sem exceção.** Toda a paleta e toda a tipografia descendem da Seção 0; escrevê-la depois dos tokens é escrevê-la para justificar o que já existe.

O `Design-System.md` atual tem 1.500 linhas de token e **nenhuma decisão de identidade**. Ele sabe que a sombra tem cinco níveis e não sabe o que o produto quer parecer.

```
Aja como o Maestro. Delegue ao product-designer a Task R.1: escrever a Seção 0 —
Direção de Arte — no topo de docs/Design-System.md, antes da Seção 1 atual.

Contexto obrigatório para ele:
- O produto é orçamento e projeto de marcenaria. O usuário é marceneiro.
- O produto já contém desenho técnico 2D: elevação de parede, plano de corte,
  cota, hachura, medida. Esse vocabulário é candidato natural a decisão
  assinatura — avalie-o antes de procurar identidade fora do domínio.
- Preservar: a paleta v3 (navy da sidebar, accent laranja) já foi decidida pelo
  operador na Seção 0 atual do documento e não é reaberta. A Seção 0 nova
  explica POR QUE ela é essa, e o que mais decorre dela.
- O teste de identidade é obrigatório: cubra a logo de uma captura — um
  marceneiro reconhece que é este produto, ou poderia ser qualquer SaaS?
  Se falhar, reescreva antes de reportar pronto.
```

**Como saber que ficou bom**: leia a tese visual. Se ela pudesse abrir o Design System de um CRM, de um app de finanças e de um sistema de RH sem trocar uma palavra, ela não é uma tese — devolva.

---

## R.2 — Composição de Telas (`product-designer`, 2 tasks)

O documento que nunca existiu. Sem ele, todo o resto do stage é maquiagem: o `frontend-engineer` continua improvisando arranjo task a task, e o `art-director` não tem régua para julgar.

**Task R.2a — as cinco telas críticas**

| Tela | Rota | Por que está na primeira leva |
|---|---|---|
| Orçamento | `/orcamento/[id]` | Quatro abas; é o centro do produto |
| Editor de Item | `/orcamento/[id]/item/[itemId]` | A tela que você descreveu como "extremamente amador" |
| Catálogo | `/catalogo` | Tela densa de consulta; define o padrão de densidade |
| Biblioteca | `/biblioteca` | Irmã do Catálogo — as duas precisam de composição coerente entre si |
| Proposta impressa | `/proposta/[id]/pdf` | Nível `vitrine`: é o documento que o marceneiro envia ao cliente dele |

**Task R.2b — as demais**: Dashboard `/`, Novo orçamento `/orcamento/novo`, Perfil `/perfil`, Materiais `/configuracoes/materiais`, Proposta `/proposta`, Login `/login`, Signup `/signup`.

```
Aja como o Maestro. Delegue ao product-designer, em Modo Composição de Tela,
a Task R.2a: escrever docs/Screen-Composition.md para as cinco telas críticas.

Instrução específica para este projeto:
- Ancore a composição no que EXISTE, não no que foi planejado. Use Glob/Read nas
  telas reais — o app divergiu do Mapa-de-Telas em pontos que o documento não
  capturou.
- Duas telas exigem decisão de densidade explícita e oposta: Catálogo e
  Biblioteca são telas de consulta (densas); o Editor de Item é formulário em
  etapas (espaçoso na coluna de decisão, denso na coluna técnica). Declare isso,
  porque hoje as duas colunas do Editor competem pelo mesmo peso.
- O campo "Poda" não é opcional em nenhuma tela. Especialmente no Editor de Item:
  diga o que sai da tela e para onde vai.
```

---

## R.3 — Decompor os monólitos (`frontend-engineer`, 3 tasks)

**Antes da erradicação do CSS legado, não depois.** Trocar `.card` por `<Card>` dentro de um arquivo de 2.250 linhas é onde correções desse tipo morrem: o diff fica ilegível, o gate não consegue auditar, e a task volta duas vezes até alguém desistir.

| Task | Arquivo | Linhas | Teto |
|---|---|---|---|
| R.3a | `components/ambientes/AmbientesLab.tsx` | 2.250 | 400 |
| R.3b | `app/components/BoxCanvas.tsx` | 1.086 | 400 |
| R.3c | `app/modulo/EditorItemNucleo.tsx` | 1.003 | 400 |

```
Aja como o Maestro. Task R.3c: decompor app/modulo/EditorItemNucleo.tsx
(1.003 linhas) até nenhum arquivo da árvore passar de 400.

Restrições:
- Decomposição pura: separar apresentação de lógica, extrair sub-componentes.
  Nenhuma mudança de comportamento, nenhuma mudança visual nesta task.
- O núcleo é compartilhado por /modulo e /orcamento/[id]/item/[itemId] —
  confirme com graphify explain antes de mover qualquer coisa.
- qa-engineer roda os testes existentes: refatoração sem regressão é o critério.
```

Repita para R.3a e R.3b. Faça uma por rodada — três decomposições na mesma branch é uma task não atômica disfarçada.

---

## R.4 — Erradicar o CSS legado (`frontend-engineer`, 2 tasks)

**Isto já está especificado.** O `Design-System.md` §16.4 descreve a correção item a item — título de card, sistema de botão, rótulo "Salvar" ambíguo, inputs sem token, grid de campos. Escrito em 24/08 e nunca agendado. Esta task é executar o que já foi decidido.

| Task | Alvo | Ocorrências |
|---|---|---|
| R.4a | Árvore `app/modulo/` — 11 arquivos | 59 |
| R.4b | `app/configuracoes/materiais/page.tsx` (7) + `app/proposta/page.tsx` (1), e a remoção das 59 definições em `app/globals.css` | 8 + 59 |

```
Aja como o Maestro. Task R.4a: erradicar o CSS legado da árvore app/modulo/,
executando as correções já especificadas em docs/Design-System.md §16.4.

Critérios de aceitação:
- scan-legacy retorna 0 em app/modulo/
- Nenhum <button className="primary|ghost|danger"> resta: todos viram Button do
  shadcn com a variante equivalente (foco visível é requisito, não melhoria)
- Todo <div className="card"> vira Card do shadcn, com CardTitle na escala
  text-titulo-secao — elimina o segundo sistema de título da tela
- Inputs e selects viram Input/Select/Label da Seção 7.9
- O botão "Salvar" que apenas avança o accordion vira "Avançar" (§16.4)
- app/globals.css mantém as classes até R.4b fechar; a remoção do CSS morto é a
  última linha de R.4b
```

Ao fim de R.4b, `scan-legacy` no projeto inteiro deve retornar **0**, e as classes legadas saem de `app/globals.css`.

---

## R.5 — Composição e acabamento por tela (`frontend-engineer`, 5 tasks)

A task terminal de cada tela crítica. Aqui a tela deixa de ser um conjunto de peças e passa a ser um objeto com dono. Depende de R.2a, R.3 e R.4 fechadas.

Uma task por tela — **nunca duas telas na mesma branch**:

```
R.5a  Orçamento          /orcamento/[id]
R.5b  Editor de Item     /orcamento/[id]/item/[itemId]
R.5c  Catálogo           /catalogo
R.5d  Biblioteca         /biblioteca
R.5e  Proposta impressa  /proposta/[id]/pdf   (nível vitrine)
```

```
Aja como o Maestro. Task R.5b: composição e acabamento do Editor de Item.

Definição de pronto: veredito APROVADO do art-director para esta tela.

Critérios:
- Composição conforme a seção da tela em docs/Screen-Composition.md, lida inteira
- Um único sistema de título, botão, campo e card na tela
- Quatro estados no mesmo nível de acabamento
- scan-legacy = 0 nos caminhos da tela
- Nenhum arquivo de UI da tela acima de 400 linhas
```

Depois de cada uma (ou em levas de duas):

```
Aja como o Maestro. Convoque o art-director para as telas <X> e <Y>.
As capturas do ux-auditor já estão em .maestro/tmp/screenshots/ — ele reaproveita.
```

**Espere reprovação na primeira rodada.** Um gate de composição que aprova tudo de primeira, numa base com esse histórico, é um gate que não está funcionando.

---

## R.6 — As três telas `vitrine` (`frontend-engineer`, 3 tasks)

Depende de R.2b. Bateria adicional do `art-director`: momento visual próprio, entrada orquestrada, copy de venda, resistência ao zoom.

```
R.6a  Login             /login
R.6b  Signup            /signup
R.6c  Proposta impressa /proposta/[id]/pdf   (se não fechou em R.5e)
```

A proposta impressa é a mais importante das três, e provavelmente a mais negligenciada do sistema inteiro: **ela é o material de venda do seu cliente**. Um marceneiro que envia um PDF bonito ao cliente dele associa isso ao seu produto toda vez.

---

## R.6b — Arquivar as propostas resolvidas (você, 5 minutos)

Das 14 propostas em `.maestro/proposals/`, **13 estão resolvidas**: quatro já tinham sido promovidas ao plugin em versões anteriores e ninguém arquivou o arquivo; nove entraram na 3.9.1; e a de teste de interação (`2026-07-31-cobertura-teste-interacao-ui.md`) foi resolvida por decisão registrada — não investir na camada de teste, e nomear a lacuna no `qa-engineer` e no `art-director`.

```powershell
cd D:\Github\orcamentofacil\.maestro\proposals
mkdir aplicadas
move 2026-07-31-*.md aplicadas\
move 2026-08-04-*.md aplicadas\
move 2026-08-06-*.md aplicadas\
move 2026-08-08-*.md aplicadas\
move 2026-08-12-*.md aplicadas\
move 2026-08-13-*.md aplicadas\
move 2026-08-14-*.md aplicadas\
move 2026-08-17-*.md aplicadas\
```

Fica em aberto **apenas** `2026-08-05-executor-nao-deve-cacar-credencial-supabase.md` — não pela regra do agente, que entrou na 3.9.1, mas pelos dois itens operacionais que ela levanta e que continuam de pé (abaixo).

## R.6c — As duas pendências operacionais do Supabase (você)

A proposta de 05/08 registra dois problemas que nunca foram resolvidos e que **não são do framework, são do seu ambiente**:

**1. Chaves potencialmente comprometidas, rotação adiada.** O `backend-engineer` imprimiu chaves reais do Supabase no transcript em 05/08. Sua decisão na época foi tratar como comprometidas e adiar a rotação "para o lançamento". Você decidiu agora adiar de novo — o que é legítimo, mas desta vez com data. Registre no Backlog, com a data preenchida:

```
aceito adiar a rotação das chaves do Supabase — <motivo> — decidido em 2026-08-25
— autorizado por Matheus — reavaliar em: <DATA>
```

Sugestão de gatilho, se preferir data condicional a data fixa: **antes do primeiro usuário real fora da sua conta**. É o momento em que "projeto em desenvolvimento" deixa de ser verdade, e é o argumento que sustentou os dois adiamentos anteriores.

**2. Ninguém consegue aplicar migration no projeto real.** A CLI não tem privilégio na conta (`LegacyLinkProjectStatusError` — o projeto `ioakptuwhfvlirvrciwg` nem aparece em `supabase projects list`) e o sandbox bloqueia `db push`. Nem executor, nem Maestro. **Isso não trava a reparação** — R.1 a R.8 são só interface — mas trava a primeira task de backend depois dela. Duas saídas: relinkar a conta da CLI com a organização certa, ou assumir que migration real é sempre passo manual seu, pelo SQL Editor do dashboard, e registrar isso no `Status.md` para nenhum contrato voltar a pedir o impossível ao executor.

## R.7 — Fechar o cemitério (você + Maestro, 1 sessão)

`docs/Backlog.md` tem três seções de "Gaps … sem task própria ainda", com cerca de 15 itens. Nenhum tem data, dono ou gate.

```
Aja como o Maestro. Task R.7: percorra as três seções "Gaps registrados, sem
task própria ainda" do Backlog. Para cada item, apresente-me:
- o que é, em uma linha
- o custo estimado da correção
- se ele afeta alguma das telas do stage de Reparação

E me peça a decisão, item a item. Duas saídas possíveis, nenhuma terceira:
(1) vira task de acabamento neste stage, ou
(2) vira recusa explícita registrada como
    "aceito lançar com isto — <motivo> — <data> — autorizado por Matheus"

Não arquive nenhum como "candidato a task futura".
```

Alguns já dá para antecipar: as peças do plano de corte com cor azul estática em vez da cor real do material (§9.4) e a mensagem de validação citando `"bancada"` em vez de "Meio" são acabamento visível, baratos, e estão parados há semanas.

---

## R.8 — Fechar o stage

```
/maestro-stage-close
```

Os seis critérios. O stage não fecha sem os seis:

```
1. Tasks mescladas                      R.1 a R.7
2. Suíte completa verde                 npm run test
3. art-director APROVADO                em cada uma das telas tocadas
4. scan-legacy = 0                      nas telas do stage
5. Zero dívida arquivada em silêncio    R.7 resolvida
6. Teto de arquivo respeitado           nenhum .tsx de UI acima de 400
```

---

## Ordem final, para colar na parede

```
R.0  config + medição                     você, 15 min
R.1  Seção 0 — Direção de Arte            product-designer
R.2a Composição — 5 telas críticas        product-designer
R.2b Composição — demais telas            product-designer
R.3  Decompor 3 monólitos                 frontend-engineer   (3 rodadas)
R.4  Erradicar CSS legado                 frontend-engineer   (2 rodadas)
R.5  Composição e acabamento — 5 telas    frontend-engineer   (5 rodadas)
R.6  Vitrine — login, signup, proposta    frontend-engineer   (3 rodadas)
R.6b Arquivar as 13 propostas resolvidas   você, 5 min
R.6c Pendências do Supabase (chaves+CLI)   você
R.7  Fechar o cemitério                   você + Maestro
R.8  /maestro-stage-close                 os seis critérios
```

**Regra de Lote**: são ~15 rodadas de agente, mais três etapas suas. Não tente numa sessão só — o Maestro reenvia a conversa inteira a cada turno, e uma instância que atravessa o dia começa custando ~120k tokens por chamada e termina em ~300k. Feche Lote a cada 3 ou 4 tasks, deixe o handoff em `.maestro/state/handoff.md` e abra sessão nova. Isso não perde memória: a memória está em arquivo.

---

## Três coisas para vigiar

**Se o `art-director` aprovar tudo de primeira**, desconfie. Leia o veredito dele e confira se a rubrica foi aplicada com medição — teste do vulto com imagem desfocada salva como evidência, contagem de eixos de alinhamento, `scan-legacy` rodado. Gate que aprova sem medir é gate decorativo.

**Se ele reprovar com achado sem citação**, ele quebrou a própria Regra Absoluta. Devolva pedindo a linha da Composição, o item da rubrica ou a declaração da Seção 0 — e o caminho da imagem. Um veto sem fonte é exatamente o que a esteira antiga evitou com razão.

**Se uma task de R.4 ou R.5 estourar o dobro do tamanho previsto**, o `frontend-engineer` tem instrução de parar e reportar. Deixe ele parar. A alternativa — seguir em silêncio — é como um retrofit vira um arquivo de 2.000 linhas que ninguém audita.
