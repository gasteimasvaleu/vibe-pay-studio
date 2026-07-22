## Objetivo

Substituir o composer atual de `/chat-agendamento` (área inferior direita, com `Textarea` simples + linha de ícones minimalistas + botão "Continuar") pelo mesmo componente visual usado em `/chat` (`ChatComposer`), adaptado para o contexto de mensagem em massa agendada.

## O que muda

Arquivo: `src/routes/_authenticated/chat-agendamento.tsx`

1. Substituir o bloco atual (linhas ~417–476: `Textarea` + linha de `ComposerIcon` + botão "Continuar") por uma composição baseada no `ChatComposer` já existente.
2. Manter, acima do composer, o chip "Programado para dd/MM, HH:mm" com botão para remover — continua controlado por `scheduledAt` / `onClearSchedule`.
3. Manter o botão "Continuar" logo abaixo do composer (largura total, `bg-gradient-primary`) — ele é o gatilho de fluxo (avançar para revisão/envio do broadcast), diferente do envio direto do chat 1:1.

## Adaptação do ChatComposer ao contexto de broadcast

O `ChatComposer` foi desenhado para envio 1:1. Para reutilizá-lo aqui sem duplicar código nem quebrar o chat:

- Usar em modo "creator" (`isCreator=true`) para expor os ícones de mídia, preço, emoji flutuante — desabilitando os que não fazem sentido em broadcast (videochamada 1:1, broadcast dentro de broadcast).
- Passar `onSend` que **não envia direto**: apenas guarda `text`, `media` e `priceCents` no estado da página (novos states: `broadcastDraft`) e move o fluxo para o próximo passo (equivalente ao atual "Continuar").
- Adicionar prop opcional ao `ChatComposer`:
  - `hideCallInvite?: boolean`
  - `hideBroadcast?: boolean`
  - `hideRecord?: boolean` (áudio em broadcast pode ser mantido; decidido: manter)
  - `submitLabel?: string` — para trocar o ícone de seta pelo texto "Continuar" quando desejado, OU manter o botão de envio circular do composer e remover o "Continuar" externo (ver decisão abaixo).
- Adicionar prop `scheduledAt` + `onOpenSchedule` para renderizar o ícone `CalendarCheck` (agendamento) dentro da barra do composer, marcado como `active` quando houver data.

## Decisão de UX do botão principal

Manter o padrão visual do `/chat` (botão circular com seta no canto direito do composer) e **remover** o botão "Continuar" externo. O clique nele dispara o `onSend` do composer, que na página de agendamento executa a transição para a etapa de confirmação do disparo (usando `scheduledAt` obrigatório se o usuário quiser agendar; envio imediato caso contrário).

Isso deixa o `/chat-agendamento` visualmente idêntico ao `/chat`, apenas com:
- Chip "Programado para…" acima quando houver agendamento.
- Ícone `CalendarCheck` dentro do composer, abrindo o `DateDialog` existente.
- Sidebar de filtros de contatos preservada à esquerda.

## Ajustes técnicos

- Em `src/components/chat/ChatComposer.tsx`: adicionar props opcionais `hideCallInvite`, `hideBroadcast`, `scheduledAt`, `onOpenSchedule` (retrocompatíveis; nada muda em `/chat` se não passadas).
- Em `chat-agendamento.tsx`: importar `ChatComposer`, remover `Textarea`/`ComposerIcon`/`Button` "Continuar", ligar states existentes (`message`, `scheduledAt`, `setDateDialogOpen`) aos handlers do novo composer, e implementar `onSend` local que valida seleção de filtros + agendamento e avança o fluxo.
- Remover imports não usados (`ComposerIcon`, `Textarea`, `ImageIcon`, `Mic`, `Archive`, `Images`, `Smile`, `Tag` isolados etc.) após a substituição.

## Fora de escopo

- Nenhuma mudança na sidebar esquerda de filtros de contatos.
- Nenhuma mudança no calendário (`view === "calendar"`).
- Nenhuma alteração no backend de broadcasts (`broadcast_jobs`).
