# Corrigir "cannot add `presence` callbacks … after `subscribe()`" no perfil

## Diagnóstico (confirmado pelo errorComponent)

Erro exato: `cannot add 'presence' callbacks for realtime:online-users after 'subscribe()'`.

Causa: em `src/hooks/useIsUserOnline.ts` (linha 30) o leitor chama `supabase.channel("online-users")` para ler a presença. Esse nome é o mesmo usado pelo `usePresenceHeartbeat` global, que já executou `.subscribe()`. O Supabase Realtime retorna a **mesma instância de canal** quando o topic já existe — então o `.on("presence", …)` seguido de novo `.subscribe()` é aplicado sobre um canal já inscrito e lança. Isso é o que joga o loader para o `errorComponent` e resulta na tela branca original.

O canal auxiliar `"online-users-reader-" + userId` (linhas 16–26) também é código morto — nunca lê `presenceState` de outro topic.

## Correção

Substituir a estratégia de presença pelo campo `profiles.last_seen_at` (já mantido pelo heartbeat global). É consistente com o badge "Online hoje" do header e não conflita com o singleton de canal.

1. **Reescrever `src/hooks/useIsUserOnline.ts`** para:
   - Buscar `last_seen_at` do `userId` alvo via `supabase.from("profiles").select("last_seen_at").eq(...)`.
   - Considerar online se `now() - last_seen_at < 90s`.
   - Repetir a checagem com `setInterval` de 30s enquanto o hook estiver montado.
   - Cleanup: `clearInterval`. Sem canais de Realtime.

2. **Nenhuma migração** e nenhum outro arquivo precisa mudar — a bolinha verde no avatar e demais consumidores do hook continuam com a mesma assinatura (`boolean`).

3. **Verificar** recarregando `/perfil/monetisexy` como `sexandoapp7`: página deve renderizar normalmente, bolinha verde acende quando o dono esteve ativo nos últimos ~90s.

## Detalhes técnicos

- Arquivo único: `src/hooks/useIsUserOnline.ts`.
- Deixa `usePresenceHeartbeat` intacto (ele já grava `last_seen_at`).
- `errorComponent` do perfil (adicionado no turno anterior) permanece — agora só cobre erros futuros.
