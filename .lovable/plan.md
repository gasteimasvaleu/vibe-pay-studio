## Simplificar arquitetura de rotas

Modelo final (3 áreas + onboarding):

```
/feed                    home de todos (assinante e creator)
/perfil/$username        perfil público
/dashboard               dashboard do usuário logado (adapta por account_type)
/creator/onboarding/...  fluxo de virar creator (só quem já iniciou)
```

### 1. Consolidar dashboard
- Criar `src/routes/_authenticated/dashboard.tsx` — página única que carrega o `profile` e renderiza:
  - **Assinante**: cards atuais (Chat, Assinaturas, Carteira, Atividades, Definições, Ajuda, Sair) + item "Virar creator" no bloco de ações (leva ao próximo passo do onboarding). Sem card promocional grande.
  - **Creator**: cards equivalentes + ações extras de creator (Publicar, Assinantes, Ganhos) e link para o perfil público.
- Deletar `src/routes/_authenticated/assinante.tsx`.
- Deletar `src/routes/_authenticated/creator.tsx` (o painel simples "Olá, @user" some — vira parte do dashboard).

### 2. Roteamento pós-login
- Em `src/lib/auth.ts`, `homeForAccountType` retorna `/feed` para ambos os tipos.
- Remover a função ou simplificar para retornar sempre `/feed`.
- `routeAfterAuth` continua chamando `navigate({ to: "/feed" })`.

### 3. Feed vira home única
- `src/routes/_authenticated/feed.tsx` já existe. Ajustar o header/menu:
  - Link para `/dashboard` (ícone user/settings).
  - Link para `/perfil/$username` (perfil público do próprio usuário).
  - Para creator: botão extra "Publicar" no topo (placeholder por enquanto).
- Remover referência a `/assinante` de qualquer link.

### 4. Fluxo virar creator
- CTA "Virar creator" fica **dentro do dashboard do assinante**, como um item da lista de ações (não como banner). Texto muda para "Continuar cadastro" se onboarding já iniciado.
- Rotas `/creator/onboarding/*` permanecem. Ao concluir KYC, o webhook já promove para `creator` e marca `onboarding_completed_at`.
- Página `/creator/onboarding/documentos/aprovado` continua igual mas o CTA final "Ir para o painel" passa a apontar para `/feed`.
- Todos os `redirect({ to: "/creator" })` (onboarding intermediário, guarda antiga) viram `redirect({ to: "/dashboard" })` ou `/feed` conforme o caso.

### 5. Guardas
- `/dashboard`: só exige autenticação. Se `account_type === 'creator'` e `onboarding_completed_at` nulo, redireciona para o próximo passo do onboarding (evita creator meio-cadastrado ver dashboard vazio).
- Onboarding: continua livre para quem está logado (assinante ou creator que ainda não completou).
- Remover a lógica atual em `creator.tsx` — vai para o novo `dashboard.tsx` adaptada.

### 6. Links órfãos a limpar
- `src/lib/auth.ts` → só `/feed`.
- Qualquer `<Link to="/assinante">` ou `to="/creator">` no código → `/dashboard` ou `/feed`.
- Header do feed, footer, navbar, botões de "Voltar ao painel" nas telas de onboarding.

### Arquivos afetados
Criados:
- `src/routes/_authenticated/dashboard.tsx`

Deletados:
- `src/routes/_authenticated/assinante.tsx`
- `src/routes/_authenticated/creator.tsx`

Editados:
- `src/lib/auth.ts` (homeForAccountType simplificado)
- `src/routes/_authenticated/feed.tsx` (links do header)
- `src/routes/_authenticated/creator.onboarding.*.tsx` (redirects para `/dashboard`/`/feed`)
- `src/routes/_authenticated/creator.onboarding.documentos.aprovado.tsx` (CTA final)
- `src/routes/entrar.tsx`, `src/routes/cadastro.tsx` (usam `routeAfterAuth`, sem alteração direta)
- Qualquer componente com link para `/assinante` ou `/creator`

Sem migrações — o schema não muda; `account_type` continua guiando o que aparece no dashboard.