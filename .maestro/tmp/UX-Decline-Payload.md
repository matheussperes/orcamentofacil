# UX Decline Payload

**Task**: 4.15
**Branch**: feature/4.15
**Data**: 2026-08-13
**Veredicto**: REPROVADO

## 1. Diálogo de exclusão de organização sem o campo de confirmação por digitação

- **Componente**: `components/perfil/PerfilLab.tsx` (`SecaoExcluirConta`, linhas 231-265)
- **Regra violada**: `docs/Design-System.md` Seção 7.11, bloco "Exclusão de organização (Q-13) — o caso de maior severidade, um passo a mais": *"Campo de confirmação por digitação: `Input` (7.9) abaixo do corpo, rótulo 'Digite `<nome da organização>` para confirmar', placeholder vazio (...). O botão primário/destrutivo do rodapé (...) permanece `disabled` até o texto digitado bater exatamente com o nome da organização."* O texto do próprio Design System nomeia explicitamente que o padrão simples de "nomear + irreversível" **não basta sozinho** para este caso específico, por ser a única operação multi-tenant e irreversível do produto.
- **Breakpoint**: desktop (1440px), único capturado (nível Leve)
- **Esperado**: `Input` com rótulo "Digite Marcenaria Boa Vista para confirmar" abaixo do texto de aviso, e botão destrutivo desabilitado até o texto bater
- **Encontrado**: Dialog vai direto do texto de aviso para o rodapé com "Cancelar"/"Excluir tudo" — nenhum campo de digitação, botão nunca fica desabilitado por conferência de nome
- **Evidência**: `.maestro/tmp/screenshots/4.15-dialog-confirmacao.png`

## 2. Botão de confirmação não usa o estilo sólido reforçado especificado

- **Componente**: `components/perfil/PerfilLab.tsx` linha 260 (`<Button variant="danger" onClick={confirmar}>`)
- **Regra violada**: `docs/Design-System.md` Seção 7.11, mesmo bloco: *"O botão primário/destrutivo do rodapé (`destructive` sólido: `bg-erro text-cinza-0 hover:bg-erro/90`, diferente do `destructive` outline padrão da 7.1 — a severidade máxima justifica o contraste maior)"*
- **Breakpoint**: desktop (1440px)
- **Esperado**: botão sólido vermelho (`bg-erro text-cinza-0`)
- **Encontrado**: `variant="danger"` do `components/ui/button.tsx` é o outline padrão (`bg-transparent border border-cinza-300 text-cinza-700 hover:border-erro`) — visualmente idêntico ao "Cancelar" ao lado, sem o contraste sólido exigido para este caso de severidade máxima
- **Evidência**: `.maestro/tmp/screenshots/4.15-dialog-confirmacao.png`

## 3. Rótulo do botão de confirmação diverge do texto especificado

- **Componente**: `components/perfil/PerfilLab.tsx` linha 261 (`{excluindo ? "Excluindo…" : "Excluir tudo"}`)
- **Regra violada**: `docs/Design-System.md` Seção 7.11: *"Rodapé: botão secundário `outline` 'Cancelar' + botão destrutivo sólido 'Excluir organização' (rótulo explícito, não 'Excluir' sozinho)."*
- **Breakpoint**: desktop (1440px)
- **Esperado**: rótulo "Excluir organização"
- **Encontrado**: rótulo "Excluir tudo"
- **Evidência**: `.maestro/tmp/screenshots/4.15-dialog-confirmacao.png`

## Observação não bloqueante (registrar, não corrigir nesta rodada)

O botão de rejeição para não-admin usa ocultação total da seção (`{ehAdmin && <SecaoExcluirConta />}`, `PerfilLab.tsx:176`), enquanto `docs/Design-System.md` Seção 7.11 especifica botão `disabled` visível + `Tooltip` explicando a restrição de papel. Não pôde ser fotografado nesta sessão porque o harness `/dev/preview/perfil` (`components/perfil/PerfilMock.tsx`) fixa `ehAdmin` em `true` sem parâmetro de query para alternar — a divergência foi confirmada por leitura de código, não por captura visual, e por isso listada como observação e não como achado numerado do payload. Fica registrada para o frontend-engineer avaliar junto com os achados acima, já que ambos tocam o mesmo componente.

## Capturas realizadas

- `.maestro/tmp/screenshots/4.15-secao-excluir-conta.png` — seção "Excluir conta" em `/perfil`, estado fechado
- `.maestro/tmp/screenshots/4.15-dialog-confirmacao.png` — Dialog de confirmação aberto
