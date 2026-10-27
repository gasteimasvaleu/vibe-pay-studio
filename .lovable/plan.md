# Correções de segurança pendentes (7 itens)

Confirmado agora no banco: as políticas citadas existem (`Public can see lives` para anon+authenticated, `live_sessions_select_all`, `participants read messages`, `recipient marks read`, `sender updates own message`, `sender inserts messages`, `requester creates video call`, `creator creates video call invite`, `media_req_insert_requester`). Confirmado no código: o botão de videochamada ainda usa `startPaidVideoCall`, `getLive` tem o fallback para `cf_webrtc_url`, e a tela de transmitir lê `cf_webrtc_url` direto da tabela.

## 1. Lives
- Nova tabela `live_session_secrets` (live_id, cf_live_input_id, cf_webrtc_url, cf_webrtc_play_url, cf_playback_hls, outros dados da Cloudflare). RLS ligado, sem políticas, só o servidor acessa. Copiar os dados atuais e apagar essas colunas de `live_sessions`.
- `live_sessions` continua legível só com os campos públicos. A política duplicada `live_sessions_select_all` sai.
- Nova função `getLiveIngest` (só o dono da live) devolve a URL de ingest. A tela de transmitir passa a usá-la.
- `getLive` só devolve as URLs de assistir depois de checar ingresso/assinatura/acesso, e o fallback que entregava a URL de ingest ao espectador sai.
- Gerar novas URLs/chaves de ingest na Cloudflare para as lives existentes (criar novo live input e apagar o antigo).

## 2. Mensagens do chat
- Leitura: retirar SELECT direto de `content`/`metadata`. O chat passa a ler por `listMessages` (servidor), que mascara mensagens pagas não desbloqueadas para quem não é o remetente. Realtime passa a só avisar que chegou mensagem e o app busca pela função.
- Trigger: o destinatário só pode mudar `read_at`.
- Trigger: o remetente só pode mudar `content` em mensagens gratuitas e `deleted_at`. Ficam travados `price_cents`, `metadata`, `thread_id`, `sender_id`.
- Inserção pelo usuário: só texto gratuito, sem mídia/paidUpload/storyReply com arquivos. Mensagens pagas ou com mídia são criadas só pelo servidor.

## 3. Assinatura de mídia
- `signPaths` passa a receber o dono esperado e só assina caminhos na pasta do autor/remetente do registro, ou quando o acesso foi confirmado (can_see_publication / can_see_story / desbloqueio).
- Triggers em `publication_media`, `publications.preview_url` e `vault_uploads` recusam caminhos fora da pasta do próprio autor.
- Levantamento (só leitura) de registros que hoje apontam para arquivos de outra pessoa, para você revisar.

## 4. Videochamada e pedidos de mídia
- Remover as 3 políticas de criação direta.
- Criação só pelo servidor, validando preço, `video_call_enabled` e `paid_dm_upload_min_cents`.
- Recriar os dois triggers como SECURITY INVOKER (ou apagar se a validação no servidor cobrir tudo).

## 5. Botão de videochamada
- O botão passa a usar `requestVideoCall` (cria como aguardando pagamento e paga com `pay_with_wallet`, kind `video_call`). Apagar `startPaidVideoCall`. Duração sempre a do creator. Informar qual versão de `pay_with_wallet` foi usada.

## 6. Cadastro
- `handle_new_user` aceita só `subscriber` ou `free_creator`; qualquer outro valor vira `subscriber`.

## 7. Saque
- Cancelar saque com transferência já criada: cancelar no Asaas antes; só marcar `rejected` se o Asaas confirmar.
- Erro depois da transferência criada: guarda o id, mantém `requested` e deixa o webhook decidir. `failed` só se a transferência não foi criada, sempre filtrando `status = requested`.
- Webhook TRANSFER_DONE: sempre vira `paid` e registra alerta ao admin se o saque estava `rejected`/`failed`.

## Testes
- Sem login e logado como usuário comum, com supabase-js: ler URLs de live, ler mensagem paga, mudar preço para 0, criar videochamada e pedido de mídia direto. Resultados mostrados.
- Videochamada paga pelo botão, live, chat, DM pago e saque: preciso do seu ok para criar 2 usuários de teste com saldo, rodar e apagar tudo no fim. Sem esse ok, testo só os bloqueios.
- Rodar de novo a consulta de políticas e mostrar.

## Detalhes técnicos
- Migrations previstas: (1) live_session_secrets + cópia + remoção de colunas e políticas; (2) chat_messages: políticas e triggers de coluna; (3) triggers de path em mídia; (4) video_calls/chat_media_requests: políticas e triggers; (5) handle_new_user.
- Arquivos: `lives.functions.ts`, `cloudflare-stream.server.ts`, `live.$liveId.transmitir.tsx`, `chat.functions.ts`, componentes do chat que leem `chat_messages` direto, `media-sign.server.ts` e seus chamadores (publications, vault, stories, chat, collections, hides, refunds, stats), `communication.functions.ts`, `chat-monetization.functions.ts`, `VideoCallHeaderButton.tsx`, `payouts.functions.ts`, `webhooks/asaas.ts`, `asaas.server.ts` (cancelTransfer se faltar).
- A troca das chaves de ingest corta as lives que estiverem no ar no momento da troca.
