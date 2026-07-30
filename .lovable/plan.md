# Dar funcionalidade real à página /em-alta

Hoje a página é 100% estática: importa `src/lib/em-alta.mock.ts` (perfis fictícios com `picsum`/`pravatar`) e renderiza 9 carrosséis. Os cards já linkam para `/perfil/$username`, então a estrutura visual pode ser mantida — o que muda é a origem dos dados.

## O que cada seção passa a significar (dados reais)

| Seção | Ranking real | Fonte |
|---|---|---|
| Top creators | Maior faturamento líquido nos últimos 30 dias | `transactions` (status pago) agrupado por `creator_profile_id` |
| Ofertas de assinatura | Promoções ativas hoje, maior desconto primeiro | `promotions` (status ativo, dentro de `starts_at`/`ends_at`) |
| Perfis gratuitos | Perfis `kind = 'free'` com mais visualizações/posts recentes | `creator_profiles` + `profile_views` |
| As mais mimadas | Maior valor recebido em mimos em 30 dias | `tips` |
| Rumo ao topo | Criadores novos (cadastro < 90 dias) com mais conteúdo publicado; mostra contagem de fotos e vídeos | `creator_profiles` + `publication_media` |
| Em alta nos posts | Publicações com mais curtidas/desbloqueios em 7 dias | `publications`, `publication_likes`, `transactions` |
| Bombando no chat | Criadores online/ativos que mais responderam mensagens em 7 dias; badge de status real ("Responde em instantes" só se online agora) | `chat_messages`, `profiles.last_seen_at`, `user_status` |
| Chamada Um a Um | Criadores com videochamada habilitada, ordenados por chamadas concluídas | `profiles.video_call_enabled`, `video_calls` |
| Live nas alturas | Quem está AO VIVO agora primeiro; depois nº de lives nos últimos 7 dias | `live_sessions` |

## Como será construído

1. **Uma função SQL `security definer` por seção** (ou uma única RPC `em_alta_feed()` que devolve JSON com as 9 listas). Definer é necessário porque um visitante não enxerga `transactions`/`tips` de terceiros via RLS — a função só expõe campos públicos agregados (nome, username, avatar, capa, métrica de ranking), nunca valores em reais.
2. **`src/lib/em-alta.functions.ts`** com um `createServerFn` `getEmAltaFeed` chamando a RPC, sem exigir autenticação de criador.
3. **Rota `/em-alta`** passa a carregar via `useQuery` (a rota é autenticada, então também pode usar loader) com `staleTime` de alguns minutos; `em-alta.mock.ts` é removido.
4. **Cards** mantêm o layout atual, mas passam a receber os tipos reais: capa = `cover_url` do perfil (fallback para a primeira mídia pública ou um gradiente), selo verificado = `verified_at`, e cada seção exibe sua métrica real (nº de lives, fotos/vídeos, % de desconto, status de chat).
5. **Seções vazias somem** em vez de mostrar carrossel vazio — importante enquanto a base ainda é pequena. Se nenhuma seção tiver dados, exibe um estado vazio simples.
6. **Exclusões**: perfis banidos, com `restrict_search`, sem conteúdo publicado, e o próprio perfil ativo do usuário ficam fora dos rankings.

## Detalhes técnicos

- Períodos: 30 dias para receita/mimos, 7 dias para posts/chat/lives — definidos como constantes na função SQL.
- Cada lista limitada a 12 itens.
- Índices auxiliares em `transactions(creator_profile_id, created_at)`, `tips(creator_profile_id, created_at)` e `live_sessions(creator_profile_id, started_at)` se ainda não existirem.
- `GRANT EXECUTE` da RPC para `authenticated` (a rota é protegida).
- Ranking calculado sobre `creator_profile_id` para respeitar o isolamento por perfil ativo já usado no restante do app.
