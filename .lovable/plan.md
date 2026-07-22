## Objetivo

Adicionar um menu de ações (ícone `MoreVertical`) no header da conversa em `/chat/$threadId`, ao lado do botão de chamada 1:1, integrando funções já existentes (silenciar, restringir) e criando as que faltam (denunciar, limpar conversa, apagar conversa, ver perfil, bloquear/desbloquear).

## Ações no menu

Ordem no `DropdownMenu`:

1. **Ver perfil** — navega para `/perfil/$username`.
2. **Silenciar / Reativar notificações** — usa `muteProfile` / `unmuteProfile` (já existe). Estado atual via `isMuted`.
3. **Restringir / Remover restrição** — só aparece quando o parceiro é assinante do criador logado. Usa `restrictSubscriber` / `unrestrictSubscriber`. Estado via `isSubscriberRestricted`.
4. **Denunciar usuário** — abre `Dialog` com motivo (Spam, Assédio, Conteúdo impróprio, Outro) + campo livre. Nova server fn `reportUser` que insere em `content_reports` (`target_type='profile'`).
5. **Limpar conversa** — separator + item destrutivo. Confirma via `AlertDialog`. Nova server fn `clearThread` que grava `cleared_at` do usuário atual; mensagens anteriores somem só para ele.
6. **Apagar conversa** — item destrutivo. Confirma via `AlertDialog`. Nova server fn `deleteThreadForMe` que grava `deleted_at` do usuário; oculta thread da lista até nova mensagem chegar. Redireciona para `/chat`.

## Mudanças de banco (uma migração)

Em `public.chat_threads`, adicionar per-user (side A/B já existe como `user_a`/`user_b`):

- `cleared_at_a timestamptz`, `cleared_at_b timestamptz`
- `deleted_at_a timestamptz`, `deleted_at_b timestamptz`

Atualizar:

- `listThreads`: filtrar threads onde `deleted_at_<side> IS NULL OR last_message_at > deleted_at_<side>`; ignorar `last_message` de `chat_messages` anterior a `cleared_at_<side>` no preview/unread.
- Trigger em `chat_messages` (ou lógica em `sendMessage`) que zera `deleted_at_<side>` do destinatário quando nova mensagem chega (para reaparecer na lista).
- Leitura de mensagens em `chat.$threadId.tsx` filtra `created_at > cleared_at_<side>` do usuário logado.

Nada de "apagar para os dois" — é sempre soft-delete por lado (padrão WhatsApp/IG).

## Novas server functions

Em `src/lib/chat.functions.ts`:

- `clearThread({ threadId })` — set `cleared_at_<side> = now()`.
- `deleteThreadForMe({ threadId })` — set `deleted_at_<side> = now()` e `cleared_at_<side> = now()`.
- `reportUser({ targetUserId, reason, details })` — insere em `content_reports`.

## Componente

Novo `src/components/chat/ThreadActionsMenu.tsx` que recebe `threadId`, `partnerId`, `partnerUsername`. Encapsula `DropdownMenu` + `AlertDialog`s + `Dialog` de denúncia, e usa `useQuery`/`useMutation` para os estados de mute/restrict.

Renderizado em `src/routes/_authenticated/chat.$threadId.tsx` dentro do `<header>`, à direita do `VideoCallHeaderButton`.

## Fora de escopo

- Bloquear (bidirecional) — não temos tabela; se quiser, faço em passo separado.
- Apagar mensagens individuais — não solicitado.
