## Objetivo

Tornar `Configurações de Chat` funcional: persistir mensagem de boas-vindas (com mídia, áudio, emoji e tag) e enviá-la automaticamente em toda nova assinatura, incluindo renovações.

## 1. Banco (migration)

Adicionar em `public.profiles`:
- `chat_welcome_enabled boolean not null default false`
- `chat_welcome_message text` (nullable)
- `chat_welcome_media jsonb not null default '[]'` — array de `{ path, mime, kind: 'image'|'video'|'audio', durationSec? }`, referenciando objetos no bucket `publications` (privado, já existente).
- `chat_welcome_tag text` (nullable, ex.: assinante-novo)

Trigger em `public.subscriptions` (AFTER INSERT/UPDATE, quando transiciona para `status='active'`):
- Função `public.send_welcome_message_on_subscription()` (SECURITY DEFINER):
  - Lê `chat_welcome_enabled/message/media/tag` do criador (`NEW.creator_id`).
  - Se habilitado e (mensagem OU mídia presentes): obtém thread via lógica de `get_or_create_thread` (par ordenado user_a/user_b) entre criador e assinante, criando se necessário.
  - Insere `chat_messages` com `sender_id = creator_id`, `price_cents = 0`, `content = message ?? ''`, `metadata = { welcome: true, tag, media }` (adicionar coluna `metadata jsonb` em `chat_messages` se ainda não existir — verificar; caso já exista `read_at/price_cents` sem metadata, criar coluna).
  - Sempre executa (renovações reenviam), sem dedup.

## 2. Storage

Reutilizar bucket privado `publications` com prefixo `chat-welcome/{userId}/...`. Policies existentes já cobrem owner insert/read; assinantes recebem acesso de leitura via nova policy em `storage.objects`:
- SELECT allow quando `bucket_id='publications'` e o objeto está em `chat-welcome/<creator_id>/...` e existe subscription ativa entre `auth.uid()` (assinante) e `<creator_id>` (extrair primeiro segmento após `chat-welcome/` do `name`).

## 3. Server functions (`src/lib/chat.functions.ts`)

- `getChatWelcome()` → `{ enabled, message, media: [{ path, url (signed), mime, kind, durationSec }], tag }`. Gera signed URLs (1h) para preview.
- `updateChatWelcome({ enabled, message?, mediaPaths: string[], tag? })`:
  - Zod: se `enabled`, exigir `message.trim().length >= 3` OU pelo menos 1 mídia.
  - Valida que cada `path` começa com `chat-welcome/<userId>/`.
  - Faz update em `profiles`.
- `createWelcomeUploadUrl({ filename, mime })` → retorna signed upload URL para `publications/chat-welcome/<userId>/<uuid>-<filename>` (via `supabase.storage.from('publications').createSignedUploadUrl`).

## 4. UI (`src/routes/_authenticated/settings/chat-settings.tsx`)

Substituir estado local mockado por:
- `useQuery(getChatWelcome)` para carregar.
- `useMutation(updateChatWelcome)` no botão Salvar (loading + toast).
- Ícones do composer passam a funcionar:
  - **Imagem/Vídeo** (`ImageIcon`): abre `<input type="file" accept="image/*,video/*">`, sobe via `createWelcomeUploadUrl`, exibe thumb removível.
  - **Áudio** (`Mic`): grava com `MediaRecorder` (webm/opus), player de preview, upload igual.
  - **Acervo** (`Archive`): reutiliza `VaultPicker` já usado no chat (importar de `src/routes/_authenticated/chat.$threadId.tsx` / componente equivalente) para selecionar item do vault e copiar `path` para lista de mídias.
  - **Emoji** (`Smile`): popover com `emoji-picker-react` (já disponível no chat) que insere no textarea na posição do cursor.
  - **Tag** (`Tag`): popover com lista curta de tags predefinidas (`assinante-novo`, `promo`, `retorno`) + input custom; salva em `chat_welcome_tag`.
- Botão "Salvar alterações" habilita quando dirty e válido; desabilita durante mutação.

## 5. Fluxo de envio automático

- Trigger SQL cobre todos os caminhos que ativam assinatura: `pay_with_wallet('subscription')`, webhook Asaas, e futuras renovações (novo INSERT com `status='active'` ou UPDATE para `active` em renovação).
- Renderização no chat (`chat.$threadId.tsx`): quando `metadata.media` presente, renderizar thumbnails/áudio/vídeo usando signed URL gerada no server ao listar mensagens. Ajustar `getThreadWithPartner` para expandir `metadata.media` em URLs assinadas (1h) para o assinante quando pertencer àquela thread.

## Considerações técnicas
- Se `chat_messages.metadata` não existir, adicionar `metadata jsonb not null default '{}'` na mesma migration.
- Tamanho máximo de mídia: 25 MB (validar client + server).
- Áudio máximo: 2 min.
- Sem versionamento: alterar boas-vindas afeta somente novas assinaturas dali em diante.
