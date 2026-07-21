## Causa raiz única

O app não escuta `supabase.auth.onAuthStateChange` em lugar nenhum. Isso faz:

1. **Cadastro trava** — o `navigate()` acontece antes do gate `_authenticated` enxergar a sessão nova, e sem listener nada re-avalia.
2. **Admin fantasma** — o `useQuery(["my-roles"])` da `TopNav` mantém `isAdmin: true` do usuário anterior no cache, e ninguém invalida.
3. **"Dono" fantasma do perfil** — o `loader` de `/perfil/$username` roda uma vez com o `viewerId` antigo; sem `router.invalidate()` no SIGNED_IN/OUT, `isOwner` continua verdadeiro para o dono anterior.

Recarregar a página resolve tudo (a sessão nova entra do zero), o que confirma o diagnóstico.

## O que vou fazer

### 1. `src/routes/__root.tsx` — adicionar o listener global de auth

Dentro do componente root, um `useEffect` que assina `onAuthStateChange` uma única vez e reage só a transições de identidade:

```tsx
useEffect(() => {
  const { data: sub } = supabase.auth.onAuthStateChange((event) => {
    if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
    router.invalidate();                       // re-roda loaders (perfil, feed, etc.)
    if (event !== "SIGNED_OUT") queryClient.invalidateQueries(); // limpa cache de roles, wallet, etc.
  });
  return () => sub.subscription.unsubscribe();
}, [router, queryClient]);
```

Isso resolve os três sintomas de uma vez.

### 2. `src/components/site/TopNav.tsx` — tirar o `useEffect` de leitura única

Trocar o `useEffect` inicial por uma escuta ativa da sessão (`onAuthStateChange` local que também repopula `signedIn`, `avatarUrl`, iniciais). Assim, se alguém trocar de conta em outra aba (ou dentro da mesma), a navbar reflete na hora — sem depender de F5. O `useQuery(["my-roles"])` já vai ser invalidado pelo listener global do passo 1.

### 3. `src/routes/cadastro.tsx` + `src/lib/auth.ts` — deixar o pós-signup determinístico

- Em `signUpWithEmail`, quando o Supabase devolve `data.session` preenchido, aguardar um `getUser()` OK antes de retornar (elimina a corrida com o gate `_authenticated`).
- Em `cadastro.tsx.onSubmit`, `await navigate({...})` (a função retorna Promise) e adicionar um `console.info` explícito nos dois branches ("com sessão → /feed" e "sem sessão → /confirme-email") para eu ter sinal se travar de novo.
- Ao concluir signup com sessão, chamar `queryClient.clear()` **antes** de navegar, para não herdar cache de um usuário anterior que porventura estivesse logado na aba.

### 4. Verificação pós-build

- Deslogar → cadastrar assinante de teste → confirmar redirect (para `/feed` ou `/cadastro/confirme-email`, conforme setting do Supabase).
- Estando logado como `caiorobbb`, deslogar e logar como `sexandoapp7`, sem F5:
  - O ícone escudo (admin) deve **sumir** imediatamente.
  - Visitar `/perfil/monetisex` deve mostrar o CTA "Assinar", **não** as ações de owner.
- Rodar `getMyRoles` server-fn é desnecessário mexer — o comportamento correto virá da invalidação de cache.

## Fora do escopo

- Não vou alterar a configuração do Supabase (confirmação de e-mail) nem criar novas policies. O bug é 100% cliente.
- Não vou reescrever o gate `_authenticated/route.tsx` (integração-gerenciado).
- Não vou tocar em RLS — o perfil é public-readable de propósito; a "edição" que você viu era só a UI mostrando controles de owner com base num `viewerId` desatualizado, o backend continua barrando qualquer write via RLS/policies (dono real: `caiorobbb`).