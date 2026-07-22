## Objetivo
Restaurar no `/chat-agendamento` as funções que o composer antigo tinha (mostradas no screenshot: imagem, microfone, arquivar, calendário, galeria, emoji flutuante, preço/tag) e substituir o botão **CONTINUAR** pela seta de envio atual do `ChatComposer`, mantendo o fluxo de disparo em massa.

## Escopo
Somente `src/components/chat/ChatComposer.tsx` e `src/routes/_authenticated/chat-agendamento.tsx`. Sem tocar em backend, tabelas ou funções de broadcast já criadas.

## Mudanças

### 1. `ChatComposer.tsx` — novas props opcionais de broadcast
Adicionar props opcionais que só ficam visíveis quando passadas (para não afetar o chat 1:1):
- `showArchive?: boolean` + `onArchive?: () => void` → ícone `Archive`.
- `showGallery?: boolean` + `onOpenGallery?: () => void` → ícone `Images` (galeria/vault).
- `showTag?: boolean` + `onOpenTag?: () => void` → ícone `Tag` (rotular disparo).
- Renderizar cada botão no bloco de ícones da esquerda somente quando `show*` for true.
- Não mexer nos ícones existentes (Paperclip, Camera, Sparkles, DollarSign, CalendarCheck, Mic, ArrowUp).

### 2. `chat-agendamento.tsx` — usar `ChatComposer` como único botão de envio
- Remover o bloco "Escreva sua mensagem / Digite e envie…" central (placeholder antigo) e o botão **CONTINUAR** — o disparo passa a ser feito pela seta de envio do `ChatComposer`.
- Passar ao `ChatComposer`:
  - `showArchive` + `onArchive` (toast "Rascunho arquivado" — placeholder de UI, sem persistência nova).
  - `showGallery` + `onOpenGallery` (abrir dialog simples informando que a seleção da galeria/vault será feita pelos anexos — reutiliza `Paperclip`).
  - `showTag` + `onOpenTag` (toast "Em breve" — mantém paridade visual com o screenshot).
  - `hideCallInvite`, `hideBroadcast` (já existentes), `scheduledAt`, `onOpenSchedule` (mantém agendamento).
  - `disabled={activeFilters.size === 0}` para exigir seleção de contatos antes do envio, preservando a regra do CONTINUAR.
- O handler `onSend` continua chamando `onSubmitBroadcast`, que já valida filtros e mostra o toast de agendamento.

## Resultado
A área inferior do `/chat-agendamento` exibe os mesmos ícones do screenshot (anexo/imagem, câmera, arquivar, calendário, galeria, emoji flutuante, preço, tag) e a seta roxa de envio no lugar do CONTINUAR, disparando ou agendando a mensagem em massa conforme o estado atual.