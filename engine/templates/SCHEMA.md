# Especificação do Formato de Template de Módulo

Cada arquivo `*.json` neste diretório define a engenharia de um módulo da biblioteca
(Camada 1 da engine — doc 04). Os templates são **fixos no MVP**: o usuário configura
apenas os parâmetros (`PARAM_*`), nunca as fórmulas.

## Variáveis disponíveis nas fórmulas

| Prefixo | Origem | Exemplos |
|---|---|---|
| `MEDIDA_` | Dimensões digitadas pelo usuário no módulo instanciado | `MEDIDA_LARGURA`, `MEDIDA_ALTURA`, `MEDIDA_PROFUNDIDADE` (mm) |
| `CONFIG_` | Configuração do módulo instanciado | `CONFIG_QTD_PORTAS`, `CONFIG_QTD_GAVETAS`, `CONFIG_QTD_PRATELEIRAS` |
| `PARAM_` | Parâmetros de fábrica do tenant (herança fábrica → ambiente → módulo) | `PARAM_ESPESSURA_CAIXA`, `PARAM_FOLGA_PORTA`, `PARAM_ESPESSURA_FUNDO` |

Fórmulas são strings avaliadas por interpretador matemático seguro (sem `eval`).
Operadores permitidos: `+ - * / ( )` e funções `ceil`, `floor`, `min`, `max`, `if`.
Unidade padrão: **milímetros**.

## Estrutura do arquivo

```jsonc
{
  "codigo": "BASE_PORTAS",          // identificador único, UPPER_SNAKE
  "versao": 1,                       // incrementa a cada alteração de fórmula
  "nome": "…",
  "categoria": "inferior|superior|torre|complemento",
  "limites": {                       // validação física (mm)
    "largura":      { "min": 0, "max": 0 },
    "altura":       { "min": 0, "max": 0 },
    "profundidade": { "min": 0, "max": 0 }
  },
  "config_padrao": { },              // valores default de CONFIG_*
  "componentes": [
    {
      "nome": "…",
      "quantidade": "2",             // número ou fórmula
      "material_tipo": "caixa|frente|fundo|prateleira",  // resolve cor/espessura via herança
      "dimensoes": {
        "altura": "MEDIDA_ALTURA",   // fórmulas
        "largura": "MEDIDA_PROFUNDIDADE"
      },
      "fita_borda": {                // lados que recebem fita
        "lados_altura": 1,           // quantos lados no sentido da altura
        "lados_largura": 1
      }
    }
  ],
  "ferragens": [
    { "item": "dobradica_35", "quantidade": "CONFIG_QTD_PORTAS * PARAM_DOBRADICAS_POR_PORTA" }
  ],
  "participa_elementos_continuos": {  // etapa global (doc 04)
    "tampo": true,                    // largura do módulo entra na soma do tampo contínuo
    "rodape": true
  }
}
```

## Convenções de engenharia

- **Base e tampo internos** descontam as laterais: `MEDIDA_LARGURA - 2 * PARAM_ESPESSURA_CAIXA`.
- **Portas** descontam folgas: largura `(MEDIDA_LARGURA / CONFIG_QTD_PORTAS) - PARAM_FOLGA_PORTA`,
  altura `MEDIDA_ALTURA - PARAM_FOLGA_SUPERIOR - PARAM_FOLGA_INFERIOR`.
- **Fundo sobreposto** usa `MEDIDA_LARGURA × MEDIDA_ALTURA` em `PARAM_ESPESSURA_FUNDO`;
  **fundo em rasgo** desconta `PARAM_PROFUNDIDADE_RASGO` das laterais/prateleiras
  (selecionado por `PARAM_TIPO_FUNDO`).
- **Dobradiças automáticas:** `max(2, ceil(alturaPorta / 450))` quando
  `PARAM_DOBRADICAS_POR_PORTA = auto`.

## Regras de manutenção

1. Alterar fórmula ⇒ incrementar `versao` e atualizar o teste golden no mesmo PR.
2. Toda variável usada deve existir nos prefixos acima — o CI valida (doc 09).
3. Novos módulos exigem no mínimo 3 cenários golden validados com marceneiro.
