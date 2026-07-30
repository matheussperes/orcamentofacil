# Instruções do Projeto

## Esteira Maestro

Este projeto usa a esteira de agentes do plugin **Maestro**.

Quando o operador disser "aja como o Maestro", ou pedir o próximo passo do projeto, delegue ao agente `maestro:maestro`. Ele lê o estado, decide qual especialista deve agir e coordena a esteira.

### Comandos

| Comando | Quando usar |
|---|---|
| `/maestro-init` | Uma vez por projeto, para criar a estrutura |
| `/maestro-discovery` | Projeto novo ou mudança de escopo relevante |
| `/maestro-next` | Executar a próxima task do backlog |
| `/maestro-status` | Ver o estado real, cruzado com o git |
| `/maestro-audit` | Auditar trabalho já implementado |
| `/maestro-retro` | Retrospectiva ao final de um stage |

### Territórios

| Caminho | Natureza | Quem escreve |
|---|---|---|
| `docs/` | Especificação deste projeto | Squad de descoberta e memory-manager |
| `.maestro/` | Estado efêmero desta esteira | Maestro e agentes |
| Código de aplicação | Implementação | Somente o squad de execução |

Regras que valem sempre:

- Estado de execução nunca sai de `.maestro/` — não escreva estado no diretório do plugin
- Lição aprendida fica primeiro neste projeto. Se for reutilizável, vira proposta em `.maestro/proposals/` e aguarda decisão humana antes de alterar o framework
- Executor recebe o contrato preenchido da task, não o PRD completo

### Convenções deste projeto

Preencha a seção `conventions` do `.maestro/config.json` para que os executores sigam os caminhos e scripts reais deste repositório, em vez de deduzir.

---

<!-- Adicione abaixo as instruções específicas do seu projeto -->
