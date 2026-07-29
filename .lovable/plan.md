## Problema

O perfil de `monetisexy` mostra badge "LIVE" e botão "ASSISTIR LIVE" verdes mesmo com nenhuma transmissão em curso. Query em `live_sessions` mostra **12 sessões travadas** com `status='live'` e `ended_at IS NULL` para esse criador, a mais recente de 27/07 (2 dias atrás). O código de `endLive` só roda quando o criador clica em "encerrar" — se ele fechar a aba, cair a rede, ou o navegador travar, a sessão fica eterna. Não existe heartbeat, `beforeunload`, `pagehide`, nem expiração no lado do leitor.

## Solução

Três camadas para nunca mais deixar live fantasma:

1. **Heartbeat + auto-end no publisher** (`live.$liveId.transmitir.tsx`)
2. **Expiração no lado do leitor** (funções de leitura em `lives.functions.ts`)
3. **Cleanup one-shot** das lives travadas atuais via migração SQL

## Passos

**1. Nova server function `pingLive` em `src/lib/lives.functions.ts`**
- Recebe `{ liveId }`, valida `creator_id === userId`, atualiza `updated_at = now()` (via `admin.update({}, ...)` para forçar o trigger, ou `set updated_at = now()`).
- Barata, sem side effects.

**2. Novo helper `expireStaleLives(admin)` em `src/lib/lives.functions.ts`**
- Marca como `ended` (status + `ended_at = updated_at`, zera `cf_webrtc_url`) toda linha com `status='live' AND updated_at < now() - interval '2 minutes'`.
- Chamado no início de `getCreatorActiveLive`, `getActiveLivesForCreators` e `listActiveLives`, escopado por `creator_id`/`creator_ids` quando possível.
- Efeito: mesmo sem heartbeat (ex: sessão antiga), o próprio fetch da badge encerra o registro em 2 min.

**3. Instrumentar `live.$liveId.transmitir.tsx`**
- `setInterval` de 15 s chamando `pingLive({ liveId })` enquanto a página estiver montada e a live estiver em `live`/`starting`.
- Listener `pagehide` (+ fallback `beforeunload`) que dispara `endLive` via `navigator.sendBeacon` para uma rota `/api/public/live-end` OU chamada síncrona ao server fn (sendBeacon é mais confiável no fechamento da aba). Preferência: criar rota pública `src/routes/api/public/live-end.ts` que valida `liveId + token curto (HMAC do liveId+creator_id)` gerado no `startLive` e devolvido para o cliente, evitando exigir sessão no beacon.
- Alternativa mais simples se aceitar 2 min de atraso: pular o beacon; contar só com heartbeat + expiração. Recomendo começar pela versão simples (sem rota pública), porque a camada 2 já garante limpeza automática.

**4. Migração SQL de limpeza**
- `UPDATE public.live_sessions SET status='ended', ended_at = COALESCE(ended_at, updated_at, now()), cf_webrtc_url = NULL WHERE status='live' AND updated_at < now() - interval '5 minutes';`
- Fecha as 12 sessões travadas do monetisexy e qualquer outra semelhante.

## Detalhes técnicos

- `live_sessions.updated_at` já existe (visto na query) — assume-se trigger padrão de `updated_at`. Se não houver, o `pingLive` faz `update({ updated_at: new Date().toISOString() })` explicitamente.
- `expireStaleLives` roda com `admin` (service role) — bypass de RLS ok, é operação de manutenção.
- Janela de 2 min: heartbeat de 15 s dá 8 tentativas antes de expirar; tolera latência/pausa breve sem falso positivo.
- Nenhuma alteração de UI. `LiveAvatarBadge` e o botão "ASSISTIR LIVE" continuam iguais — só passam a receber `null` quando a live realmente acabou.
- Escopo restrito a lives; não mexe em Stories, chamadas de vídeo, ou pagamentos.

## Arquivos afetados

- `src/lib/lives.functions.ts` — adicionar `pingLive`, `expireStaleLives`, chamar expire nos 3 readers.
- `src/routes/_authenticated/live.$liveId.transmitir.tsx` — heartbeat + `pagehide`.
- `supabase/migrations/<timestamp>_expire_stale_lives.sql` — cleanup imediato.
