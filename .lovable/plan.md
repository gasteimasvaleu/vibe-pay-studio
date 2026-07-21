## Reações e resposta a Stories

Adicionar interações no `StoryViewer` conforme o perfil do usuário:
- Contador de views ao lado do ícone do story (visível para o dono)
- Campo de resposta que abre chat direto (assinantes)
- Renderização especial da mensagem "respondeu ao story" no chat
- CTA para assinar (não-assinantes que desbloquearam)

---

### 1. Contador de views no header

- Em `getCreatorStories` (`src/lib/stories.functions.ts`), adicionar `view_count` ao `StoryItem` — `count(*)` em `story_views` filtrado por `story_id` (apenas o dono precisa deste dado, mas pode retornar sempre).
- No `StoryViewer`, ao lado do avatar/username, quando `current.is_self`, mostrar ícone 👁 + número.

### 2. Verificação de assinatura ativa

Adicionar helper no `stories.functions.ts` que retorna, para cada story carregado, se o viewer é assinante ativo do criador:
- Consulta única: `subscriptions` onde `subscriber_id = userId`, `creator_id = data.creatorId`, `status = 'active'`, `current_period_end > now()`.
- Retornar campo `viewer_is_subscriber: boolean` no `StoryItem` (mesmo valor para todos os stories do mesmo criador).
- `is_self` já conta como "pode responder" (o dono não vê barra).

### 3. Barra de resposta no rodapé (assinante)

No `StoryViewer`, abaixo da caption:
- Se `unlocked && !is_self && viewer_is_subscriber`: input "Enviar mensagem…" + botão Enviar.
- Ao enviar:
  1. `openThreadWith({ userId: creator_id })` → obtém `threadId`.
  2. Nova server function `sendStoryReply({ storyId, threadId, content })` em `chat.functions.ts` que:
     - Insere `chat_messages` com `content` e `metadata = { story_reply: { storyId, thumbUrl, mediaType, caption } }`.
     - `thumb_path` já existe (mesmo para vídeos — é o primeiro frame capturado no publish). Persistimos o `thumb_path` (não a URL assinada) e assinamos ao ler.
  3. Toast "Resposta enviada" + fecha o viewer e navega para `/chat/$threadId`.
- Enquanto envia, pausar o auto-advance (setar flag que zera o RAF loop).

### 4. Render da resposta no chat

Em `getThreadWithPartner` (`chat.functions.ts`):
- Estender `ChatMessage.metadata` com `storyReply?: { thumbUrl, mediaType, caption }`.
- Coletar `thumb_path` de `metadata.storyReply` junto com os paths de mídia atuais e assinar em lote no bucket `stories`.

Na UI do chat (`chat.$threadId.tsx` — bolha de mensagem):
- Se `metadata.storyReply` presente: renderizar acima do texto um card compacto — thumbnail 60×90px + label "Você respondeu ao story" (para o remetente) ou "Respondeu ao seu story" (para o destinatário) + caption truncada.

### 5. CTA para não-assinante que desbloqueou

No `StoryViewer`, se `unlocked && !is_self && !viewer_is_subscriber`:
- Renderizar botão `w-full` abaixo da caption com texto "Assine @username para enviar uma mensagem" que navega para `/{creator_username}` (perfil público).
- Como precisamos do username, já vem em `current.creator_username`.

---

### Detalhes técnicos

**Arquivos alterados:**
- `src/lib/stories.functions.ts` — adicionar `view_count` e `viewer_is_subscriber` em `StoryItem` e no handler de `getCreatorStories`.
- `src/lib/chat.functions.ts` — nova server fn `sendStoryReply`; estender leitura para assinar `thumb_path` do bucket `stories` e expor `metadata.storyReply`.
- `src/components/feed/StoryViewer.tsx` — header com contador (dono), rodapé condicional (input assinante / CTA não-assinante), lógica de envio + navegação.
- `src/routes/_authenticated/chat.$threadId.tsx` — renderizar card de story-reply nas bolhas de mensagem.

**Sem migrations:** o `metadata` de `chat_messages` já é `jsonb` aberto; `thumb_path` já é populado pelo publish para imagens e vídeos.

**Sem alterações de RLS:** `sendStoryReply` reusa a inserção existente via `context.supabase` (RLS de `chat_messages` já valida participação na thread).
