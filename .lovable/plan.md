## Objetivo

Habilitar **mensagens pagas** no chat: o criador define um valor no composer, envia a mensagem bloqueada, e o assinante desbloqueia via PIX (Asaas, split 85/15) para ler o conteúdo.

## O que muda

### 1. Composer com botão de preço (repurpose do "Tag")

Em `src/routes/_authenticated/chat.$threadId.tsx`, o composer hoje é só textarea + botão enviar. Adicionar linha de `ComposerIcon`s abaixo da textarea, reutilizando o padrão de `chat-agendamento.tsx`, e trocar o ícone `Tag` por `DollarSign` com o label **"Definir valor da mensagem"**.

- Clicar no botão abre um `PriceDialog` (novo componente):
  - Slider/stepper de R$ 1 a R$ 500, presets R$ 5 / R$ 20 / R$ 50 / R$ 100.
  - Opção "Sem preço (grátis)" limpa.
  - Ao confirmar, o valor fica no state local do composer.
- Quando um preço estiver definido, o ícone $ fica **ativo** (variação `active` do `ComposerIcon`) e aparece um chip discreto ao lado da textarea: `R$ X,XX · remover`.
- Somente criadores veem esse botão (checar `account_type` do viewer no `beforeLoad`); assinantes conversando com criadores continuam vendo só textarea.

### 2. Envio da mensagem com preço

Extender `sendMessage` em `src/lib/chat.functions.ts`:
- Novo campo opcional `priceCents` (int, 0–50000) no validator.
- Insere `price_cents` em `chat_messages` quando > 0.
- Retorna `priceCents` no `ChatMessage`.

Extender o tipo `ChatMessage` com:
- `priceCents: number | null`
- `unlocked: boolean` (true se `price_cents` for null/0, se sou o autor, ou se existe `chat_message_unlocks` com `status='paid'` para meu user_id).

Em `getThreadWithPartner`:
- Após buscar mensagens, se houver mensagens do parceiro com `price_cents > 0`, buscar em `chat_message_unlocks` os desbloqueios pagos do viewer para esses `message_id`s.
- Preencher `unlocked` corretamente por mensagem.

### 3. Renderização das mensagens pagas

No mapa de mensagens:

- **Minha mensagem paga** (criador): balão normal + badge no rodapé `R$ X,XX · Pago` (verde) ou `R$ X,XX · Aguardando` (âmbar), conforme o parceiro já desbloqueou.
- **Mensagem paga do parceiro ainda bloqueada** (assinante): balão substituído por um card com blur do conteúdo, ícone de cadeado, texto "Mensagem exclusiva · R$ X,XX" e botão **"Desbloquear"** que chama `createChatUnlockPayment` (via `useServerFn`) e abre o `PaymentModal` já existente com QR PIX.
- **Mensagem paga já desbloqueada**: balão normal com pequeno badge `Desbloqueado`.

No `onPaid` do modal, refazer `queryClient.invalidateQueries(["chat","messages", threadId])` para atualizar o estado `unlocked`.

### 4. Realtime

O canal `postgres_changes` de `chat_messages` já existe; incluir `priceCents` no payload mapeado e `unlocked = mine` (partner messages novas começam bloqueadas se `price_cents > 0`).

Opcional (não bloqueante): assinar também `chat_message_unlocks` filtrado por `buyer_id=viewer` para invalidar a query quando o webhook confirma pagamento, cobrindo o caso do usuário pagar em outra aba.

## Escopo técnico

- Novos arquivos:
  - `src/components/chat/PriceDialog.tsx` — dialog de valor da mensagem.
  - `src/components/chat/LockedMessageBubble.tsx` — card de mensagem bloqueada com CTA de desbloqueio.
- Alterações:
  - `src/lib/chat.functions.ts` — `sendMessage` aceita `priceCents`; `getThreadWithPartner` popula `unlocked`; tipo `ChatMessage` ganha `priceCents` e `unlocked`.
  - `src/routes/_authenticated/chat.$threadId.tsx` — composer com `ComposerIcon`s, estado de preço, renderização condicional, integração do `PaymentModal` + `createChatUnlockPayment`, `beforeLoad` passa `viewerAccountType`.
- Reuso: `PaymentModal` e `PixCheckout` já existentes; `createChatUnlockPayment` já pronto e wallet do criador já vem de `profiles.asaas_wallet_id`.
- Pré-condição já garantida no server fn: o criador precisa ter `asaas_wallet_id` (falha explícita com "criador ainda não configurou o recebimento").

## Fora de escopo

- Anexar mídia paga (só texto por enquanto).
- Cobrança em cartão dentro do chat (só PIX, coerente com o resto do app hoje).
- Auto-refresh via realtime da tabela `chat_message_unlocks` para casos multi-aba (fica como melhoria opcional).
