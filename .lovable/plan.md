## Problema

O overlay `Carregando...` (RouteTransitionOverlay) aparece em **toda** navegação e demora muito para sumir — dando sensação de travamento.

Causa raiz: cada troca de rota dispara o `beforeLoad` do layout `_authenticated` (e do `/dashboard`), que chama `supabase.auth.getUser()`. Esse método faz uma requisição de rede para `/auth/v1/user` a cada navegação. Enquanto essa chamada está em voo, o router fica em `status: "pending"` e o overlay aparece por segundos.

## Correção

### 1. Trocar `getUser()` por `getSession()` nos guards

`getSession()` lê do storage local (síncrono, sem rede). `getUser()` só é necessário quando você precisa revalidar a sessão contra o servidor — o que não é o caso de um simples guard de rota.

- `src/routes/_authenticated/route.tsx`: `beforeLoad` passa a usar `supabase.auth.getSession()`; se não houver sessão, redireciona para `/entrar`.
- `src/routes/_authenticated/dashboard.tsx`: mesmo tratamento — pega `user` de `session.user`.
- Manter o mesmo comportamento de redirect quando não autenticado.

### 2. Ajustar o `RouteTransitionOverlay` para não piscar em navegações rápidas

- Aumentar o delay antes de mostrar de `150ms` para `400ms` (evita o flash em navegações que resolvem em <400ms).
- Garantir que ele suma imediatamente quando `status !== 'pending'` (já faz, manter).

### 3. Verificação

Depois das mudanças, navegar entre `/dashboard`, `/my-monetisex-stats`, `/mywallet`, etc. — o overlay não deve mais aparecer em navegações normais, e quando aparecer deve desaparecer assim que a rota carrega.

## Fora de escopo

- Reescrever o modelo de autenticação.
- Mudar `ensureCurrentUserProfile` (roda em `useEffect`, não bloqueia navegação).
- Corrigir o warning de hydration mismatch (`data-tsd-source`) — é ruído do dev-tooling, não afeta funcionalidade.
