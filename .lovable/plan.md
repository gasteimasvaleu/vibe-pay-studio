
## O que muda em `src/routes/_authenticated/chat.$threadId.tsx`

### 1. Bolha de mensagem se adapta ao conteúdo (imagem/vídeo)

Hoje toda mensagem usa `max-w-[75%] rounded-2xl px-4 py-2` e a mídia entra em grid `grid-cols-2` com `max-h-64 object-cover`, o que corta a imagem e força uma largura fixa.

Ajustes:
- Detectar quando a mensagem é "só mídia" (sem texto, sem cards de tip/call/paid): remover `px-4 py-2`, deixar apenas `p-1` para uma borda fina e permitir que a bolha encolha ao tamanho natural da mídia (largura máxima ~320px em mobile, ~420px em desktop).
- Trocar grid fixo por:
  - 1 mídia → bloco único com `object-contain`, respeitando aspect ratio (sem crop), altura máxima `max-h-[420px]`, largura máxima `max-w-[min(75vw,420px)]`.
  - 2 mídias → 2 colunas.
  - 3+ mídias → grid 2 colunas com última ocupando linha inteira quando ímpar.
- O horário (e o badge de "Paga/Desbloqueada") passa a flutuar sobre a mídia no canto inferior direito, com fundo semitransparente escuro e texto branco (evita adicionar altura extra).
- Quando houver texto + mídia, mantemos o padding atual e a mídia continua abaixo do texto, mas com aspect ratio real (sem `object-cover`).

### 2. Menu "..." de ações na mensagem

- Adicionar wrapper `group` ao redor da bolha e um botão `...` (ícone `MoreHorizontal`) que aparece no hover em desktop e via long-press (~450 ms) em mobile. Fica ao lado da bolha — à esquerda quando `mine`, à direita quando `!mine`.
- O botão abre um `DropdownMenu` (shadcn já usado no projeto) com as ações:
  - **Responder** (`Reply`) — preenche o composer com um preview do trecho citado (estado local `replyTo` passado ao `ChatComposer`; envio inclui `metadata.replyTo`).
  - **Copiar texto** (`Copy`) — apenas quando há `m.content`; usa `navigator.clipboard`.
  - **Encaminhar** (`Forward`) — abre diálogo simples para escolher uma thread existente e reenvia conteúdo/mídia (nova server fn `forwardMessage`).
  - **Salvar mídia** (`Download`) — apenas quando há mídia desbloqueada; baixa a URL assinada.
  - **Denunciar** (`Flag`) — reaproveita fluxo já existente de report (thread menu) adaptado para mensagem (`reportMessage`).
  - **Apagar para mim** (`Trash`) — soft-delete local por usuário (nova coluna/tabela `chat_message_hides` OU campo `hidden_for` em `chat_messages`; render filtra client-side).
  - **Apagar para todos** (`Trash2`, apenas quando `mine` e enviada há < 15 min) — server fn `deleteMessageForAll` marca `deleted_at` e o render mostra placeholder "Mensagem apagada".

### 3. Backend (mínimo necessário)

Migração:
- `chat_messages`: adicionar `deleted_at timestamptz`, `reply_to_id uuid references chat_messages(id)`.
- Nova tabela `chat_message_hides(message_id, user_id, created_at, pk composta)` com GRANTs e RLS (usuário só vê/insere/apaga os próprios).

Server functions novas em `src/lib/chat.functions.ts`:
- `hideMessageForMe({ messageId })`
- `deleteMessageForAll({ messageId })` — valida ownership + janela de 15 min.
- `forwardMessage({ messageId, toThreadId })`
- `reportMessage({ messageId, reason })` — grava em `reports` existente.

O `listMessages` passa a:
- Filtrar mensagens escondidas pelo usuário atual.
- Substituir `content`/`metadata.media` por placeholder quando `deleted_at` está setado.
- Popular `metadata.replyTo` com snippet + autor quando `reply_to_id` existir.

### 4. Componentes

- Novo `src/components/chat/MessageActionsMenu.tsx` encapsulando o botão `...` + `DropdownMenu` e recebendo callbacks.
- `ChatComposer` recebe prop opcional `replyingTo` e um badge/preview acima do textarea com botão "x" para limpar.

### Fora de escopo
- Reações emoji na mensagem (podemos adicionar depois se quiser).
- Edição de mensagem enviada.

Detalhes técnicos ficam encapsulados na rota do chat, no `ChatComposer` e nas server functions listadas — nenhuma outra tela é afetada.
