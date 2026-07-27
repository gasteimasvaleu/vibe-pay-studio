# Nova página: `/creator-hub`

Página de hub do creator no estilo Privacy/Laranjinha (screenshots), com layout claro, tabs no topo, filtros e um tour de highlights acionado pelo botão `?`.

## Rota
- `src/routes/_authenticated/creator-hub.tsx` — protegida (creator/free_creator). Se `accountType === "subscriber"`, redireciona para `/dashboard`.
- `head()` com título "Creator Hub · Monetisexy" e `noindex`.

## Layout (segue screenshots)

```text
[← ] [avatar] Nome do creator                       [ ? ] [ ↻ ]
        ┌─────────────────────────────────────────┐
        │ Notificações   Destaques   Pergunte•em breve │
        └─────────────────────────────────────────┘
  (chips scroll-x)  Todas · Vendas · Mimos · Comentários · Feed
  ─────────────────────────────────────────────────
  <conteúdo da aba>
```

- Header interno próprio (não usa TopNav do app, que fica escondida via `useFullscreenOverlay`-like flag simples: renderizar dentro do layout normal mas com container `bg-card` claro forçado). Avatar/nome vêm do perfil ativo (`getMyActiveCreatorProfile`).
- Tabs pill duplo (bg claro âmbar + ativa laranja). Aba "Pergunte" desabilitada com badge "em breve".
- Chips de filtro roláveis horizontalmente com estado ativo âmbar suave.
- Botões `?` (abre tour) e `↻` (invalida queries da página).

## Abas e funcionalidade real

### 1. Notificações
Reaproveita fontes já existentes; sem tabela nova. Server fn `getCreatorHubNotifications({ filter })` em `src/lib/creator-hub.functions.ts` que agrega, para o `active_profile_id`:
- **Vendas**: linhas de `transactions` (status paid) onde o creator é destinatário — assinaturas, PPV, mimos, chat, live tickets.
- **Mimos**: subset de `transactions` do tipo tip.
- **Comentários**: `post_comments` em posts do creator ativo.
- **Feed**: `post_likes` + `post_comments` + `post_mentions` (se existir; senão só likes+comments) nos últimos 30 dias.
- **Todas**: união ordenada por `created_at desc` (limit 100).

Retorna itens normalizados `{ id, kind, title, subtitle, amountCents?, actor?, createdAt, href? }`. Renderização por linha com avatar do actor, texto e valor à direita quando aplicável. Estado vazio "Sem notificações." (igual screenshot).

### 2. Destaques
Painéis colapsáveis (accordion shadcn) — os títulos batem com o tour:
- **Vendas** — faturamento 7d, novas assinantes 7d, mídia mais vendida 7d (usa `finance.functions` já existente + query em `publications`).
- **Conquistas** — marcos R$ 100k / R$ 500k / R$ 1M com barra de progresso a partir do faturamento total (`creator_earnings` acumulado). Botão "Solicitar troféu" habilita quando marco atingido (cria linha em `trophy_requests` — nova tabela mínima `{ id, user_id, creator_profile_id, milestone_cents, status, created_at }` + RLS + grants).
- **Moderação** — posts do creator com `moderation_status` diferente de ok nos últimos 7 dias (se colunas não existirem, mostra estado vazio "Nenhuma moderação recente"). Contador na bolinha.
- **Perguntas frequentes** — FAQ estático (saques, planos, moderação, troféus).

### 3. Pergunte
Desabilitada. Placeholder "Em breve".

## Tour de highlights (botão `?`)
Componente `CreatorHubTour` (client) com 7 slides idênticos aos screenshots:
1. "Seu painel em 3 áreas"
2. "Foque no que importa"
3. "Notificações em tempo real" (texto adaptado)
4. "Vendas"
5. "Conquistas"
6. "Moderação"
7. "Perguntas frequentes"

- Dialog centralizado (shadcn) com overlay escurecido; conteúdo idêntico ao screenshot (numeração `n / 7` em laranja, título, corpo, botões Anterior/Próximo/Concluir).
- Persistência: ao concluir/fechar salva `localStorage["creator-hub-tour-v1"] = "done"`; abre automaticamente na primeira visita se não marcado. `?` reabre a qualquer momento.

## Navegação
- Adicionar ícone "Creator Hub" (sparkles) na `TopNav` ao lado do avatar, visível quando `isCreatorLike(accountType)`; link para `/creator-hub`.
- Sem alteração de BottomNav.

## Detalhes técnicos
- Novo arquivo `src/lib/creator-hub.functions.ts` com server fns protegidos (`requireSupabaseAuth`) resolvendo o `active_profile_id` do usuário antes de qualquer query.
- Nova migração:
  - `create table public.trophy_requests (...)` + GRANT authenticated/service_role + RLS (creator vê/insere as suas; admin lê tudo).
- Uso de `useQuery` + `queryClient.invalidateQueries` no botão `↻`.
- Paleta segue tokens do app (`bg-card`, `bg-muted`, `text-primary`), sem hardcode de cor laranja — usa `--primary` atual (fuchsia). Assim mantemos a identidade Monetisexy em vez de copiar o laranja Privacy.

## Arquivos novos
- `src/routes/_authenticated/creator-hub.tsx`
- `src/components/creator-hub/CreatorHubHeader.tsx`
- `src/components/creator-hub/CreatorHubTabs.tsx`
- `src/components/creator-hub/NotificationsPanel.tsx`
- `src/components/creator-hub/DestaquesPanel.tsx`
- `src/components/creator-hub/CreatorHubTour.tsx`
- `src/lib/creator-hub.functions.ts`
- `supabase/migrations/<ts>_trophy_requests.sql`

## Arquivos alterados
- `src/components/site/TopNav.tsx` — botão sparkles para creators.

## Fora de escopo
- Aba "Pergunte" (Q&A) — apenas placeholder.
- Envio físico de troféu — só registra solicitação; workflow admin fica para depois.
