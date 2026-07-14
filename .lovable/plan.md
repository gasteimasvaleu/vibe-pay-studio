## Objetivo

Diferenciar três perfis na plataforma:

| Tipo | account_type | Página pública | Dashboard / Navbar |
|---|---|---|---|
| Assinante puro (cadastro direto) | `subscriber` | ❌ | Dashboard e navbar reduzidos de assinante |
| Assinante via "Perfil Gratuito" | **`free_creator`** (novo) | ✅ (gratuita) | Iguais aos do creator |
| Creator pago (onboarding completo) | `creator` | ✅ (paga) | Dashboard e navbar de creator |

## 1. Banco de dados (migração)

- `profiles.account_type` hoje é `text` livre com CHECK/handle_new_user restringindo a `'subscriber'|'creator'`. Ampliar para aceitar `'free_creator'`:
  - Atualizar `handle_new_user()` para aceitar os três valores (fallback continua `'subscriber'`).
  - Se existir CHECK/enum restringindo os valores, ajustar.
- Não precisa migração de dados: usuários existentes ficam como estão.

## 2. Persistir tipo no fluxo `/criar-perfil-gratuito`

`src/routes/_authenticated/criar-perfil-gratuito.tsx` hoje só mostra toast. Fazer o "Criar Conta" chamar uma nova server function `createFreeCreatorProfile` (em `src/lib/onboarding.functions.ts` ou novo `src/lib/free-creator.functions.ts`) que, com `requireSupabaseAuth`:

- Valida `handle` único (checa `profiles.username`).
- Faz upload do avatar/cover para o bucket `criativos` (opcional nesta rodada; se ficar pesado, salvar só URLs picsum e deixar upload para depois — decidir com o valor atual das previews).
- Atualiza `profiles` do usuário: `username = handle`, `display_name`, `bio`, `avatar_url`, `cover_url`, `account_type = 'free_creator'`, `onboarding_completed_at = now()`.
- Retorna sucesso; página redireciona pra `/dashboard`.

Bloqueia se o usuário já for `creator` (não faz downgrade).

## 3. Dashboard

Em `src/routes/_authenticated/dashboard.tsx`:

- Ampliar `AccountType` para `"subscriber" | "free_creator" | "creator"`.
- Tratar `free_creator` como creator para efeitos de UI: renderizar **`CreatorDashboard`** (que já mostra "Meu Perfil", Chat, Acervo, Em Alta etc.).
- Manter redirecionamentos de onboarding apenas para `account_type === 'creator'` incompleto.

Em `CreatorDashboard.tsx`: aceitar prop opcional `variant: 'creator' | 'free_creator'` (default `'creator'`) para, se necessário no futuro, esconder cards ligados a monetização paga (ex.: "Meu Banco", "Ofertas"). Nesta rodada, por padrão, **mostrar todos os cards** conforme pedido ("mesmas funções"), mas manter a prop para ajuste rápido depois.

`SubscriberDashboard` continua sendo usado somente para `subscriber` puro; o `showProfileLink` pode voltar ao default (sempre escondido para subscriber puro, já que ele nunca terá página).

## 4. Navbar inferior

Em `src/components/site/BottomNav.tsx`:

- Tratar `free_creator` como não-subscriber: `const isSubscriber = accountType === "subscriber"`.
- Isso já dispara o layout de 5 colunas com botão central "Postar" e "Minha carteira" — igual ao creator.

## 5. Página pública `/perfil/$username`

`src/routes/_authenticated/perfil.$username.tsx` hoje faz `throw notFound()` quando `account_type !== 'creator'`. Trocar para permitir `creator` **e** `free_creator`. Diferenças de renderização:

- Para `free_creator`: esconder botão/CTA de "Assinar" (ou mostrar apenas "Seguir"), já que o perfil é gratuito. Preços e planos ficam ocultos.
- Manter todo o resto (bio, capa, publicações).

## 6. Outros pontos a checar

- `src/routes/_authenticated/feed.tsx`, `em-alta.tsx`, `chat.$threadId.tsx`, `settings.creator.tsx`: onde comparam com `"creator"`, ampliar para incluir `"free_creator"` quando o comportamento esperado é o mesmo (ex.: permitir postar, aparecer em Em Alta, exibir configurações de creator).
- `handle_new_user()`: já mantém `'subscriber'` como default para cadastro direto — sem mudança comportamental.

## Detalhes técnicos

- Nova server function usa `requireSupabaseAuth` + upload em `criativos` via `context.supabase.storage.from('criativos').upload(...)`.
- Regenerar tipos Supabase após a migração (automático).
- Todas as comparações `=== "creator"` na UI que hoje decidem "pode ver painel/perfil/postar" precisam virar `accountType !== "subscriber"` (helper `isCreatorLike(accountType)` em `src/lib/auth.ts`).

## Ordem de execução

1. Migração: ajustar `handle_new_user` e CHECK/enum para aceitar `'free_creator'`.
2. Novo helper `isCreatorLike` em `src/lib/auth.ts`.
3. `BottomNav`, `dashboard.tsx`, `perfil.$username.tsx`, `feed.tsx`, `em-alta.tsx`, `chat.$threadId.tsx`, `settings.creator.tsx`: usar o helper.
4. Server function `createFreeCreatorProfile` + wire no `/criar-perfil-gratuito`.
5. Build + verificação visual.
