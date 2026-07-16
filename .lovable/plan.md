# Precificar a mensagem de boas-vindas

O botão de tag (o 5º ícone da barra) passa a abrir um diálogo de precificação. Quando o criador define um preço, a mídia da mensagem de boas-vindas fica bloqueada para o assinante até ele pagar no chat — reaproveitando o fluxo de unlock que já existe (`chat_message_unlocks` + `createChatUnlockPayment` + carteira).

## UX (segue o screenshot)

- Ícone de tag (atual `Tag` popover na barra inferior) vira "Precificar mensagem" e abre um `Dialog` com:
  - Input de valor em R$ (formatado, mínimo R$ 1,00, máximo R$ 500,00).
  - Botões "Cancelar" e "Salvar".
- Quando há preço definido, aparece dentro do card (acima do textarea) uma pílula alaranjada:
  - `🏷️  Preço para visualizar` à esquerda, `R$ 50,00` à direita, botão `X` circular para remover.
  - Clicar na pílula reabre o dialog para editar.
- Se preço > 0 e `media.length === 0`, aviso pequeno acima da pílula: "Você adicionou precificação, não esqueça de adicionar uma mídia."
- O botão "Salvar alterações" fica desabilitado quando `price_cents > 0 && media.length === 0` (paywall sem mídia não faz sentido).
- A funcionalidade atual de "tag textual" (assinante-novo, promo, etc.) é removida — o ícone de tag agora representa preço, alinhado ao screenshot.

## Fluxo do assinante no chat

- Nenhuma mudança de UI necessária: `chat.$threadId.tsx` já renderiza mensagens com `price_cents > 0` como bloqueadas, mostra botão "Desbloquear por R$ X" e abre o diálogo de pagamento (`PaymentMethodDialog`) → carteira ou Asaas. Após pago, insere linha em `chat_message_unlocks` e a mídia aparece.
- Basta garantir que a mensagem automática seja criada com `price_cents = <preço definido>` em vez de `0`.

## Migração

- `public.profiles`: adicionar `chat_welcome_price_cents integer not null default 0` (check `>= 0`).
- Remover coluna `chat_welcome_tag` (não é mais usada) — ou mantê-la e apenas parar de escrever nela. **Manter** por segurança (evita reescrever o trigger e não quebra dados existentes); apenas some da UI.
- Recriar `send_welcome_message_on_subscription()`:
  - Lê `chat_welcome_price_cents` do criador.
  - Insere `chat_messages` com `price_cents = welcome_price` (em vez de 0).
  - Mantém `metadata = { welcome: true, media: [...] }` (sem `tag`).

## Server functions (`src/lib/chat.functions.ts`)

- `getChatWelcome` retorna também `priceCents: number`.
- `updateChatWelcome` aceita `priceCents` (valida 0–50000, inteiro) e persiste em `profiles.chat_welcome_price_cents`.
- Remover `tag` do payload de entrada/saída (ou aceitar e ignorar para compat).

## UI (`src/routes/_authenticated/settings.chat-settings.tsx`)

- Novo estado `priceCents: number`.
- Substituir o `Popover` do ícone `Tag` por um `Dialog` controlado (`WelcomePriceDialog`) com input monetário.
- Renderizar a pílula de preço acima do textarea quando `priceCents > 0`; botão `X` zera o preço.
- Remover renderização da tag textual e do bloco de "Escolha uma tag" / input personalizado.
- Ajustar `canSave` para bloquear quando `enabled && priceCents > 0 && media.length === 0`.

## Detalhes técnicos

- Máscara/parse: input controlado em centavos (ex.: usuário digita `50,00` → `5000`), sem depender de lib.
- O trigger não precisa mudar quando o preço muda — próximas assinaturas já pegam o valor novo. Assinaturas já existentes não são reprocessadas (comportamento atual).
- RLS/policies existentes de `chat_messages` e `chat_message_unlocks` já cobrem o caso; nada a alterar ali.

## Ordem de execução

1. Migração (coluna + trigger recriado).
2. Atualizar `chat.functions.ts` (get/update + tipos).
3. Atualizar `settings.chat-settings.tsx` (dialog + pílula + remover tag textual).
4. Verificar visualmente no preview e testar salvar com/sem mídia.
