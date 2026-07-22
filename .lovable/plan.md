## Problemas

**1. Busca não mostra o perfil creator gratuito**
`src/routes/_authenticated/search.tsx` consulta apenas `public.profiles`. Após a refatoração 1:N, cada perfil creator (pago ou gratuito) do mesmo usuário vive em `public.creator_profiles` (colunas próprias: `username`, `display_name`, `avatar_url`, `cover_url`, `kind`, etc.). Como só o perfil "raiz" está em `profiles`, o perfil free do `monetisex` nunca aparece nos resultados nem em "Mais buscados".

**2. Toast `cpf_required` ao abrir checkout de cartão na assinatura**
No fluxo de desbloqueio (`perfil.$username.tsx`) o erro `cpf_required` é interceptado e abre o `CpfPromptDialog`. Já no `SubscribeDialog.tsx` o `catch` cai direto no `translatePaymentError` e mostra o toast cru "cpf_required", sem oferecer para o usuário informar o CPF e retomar.

## Plano

### 1. Busca inclui perfis free
- Ajustar `fetchCreators` em `src/routes/_authenticated/search.tsx` para consultar `public.creator_profiles` (todos os `kind`), fazendo `JOIN` implícito com `profiles` do dono para aplicar as restrições existentes (`restrict_search`, `restrict_search_br`, `restrict_search_country`, `restrict_mentions`).
  - Estratégia: buscar em paralelo `creator_profiles` (com `select` incluindo o `profiles!inner(...)` embutido para trazer as flags e `country`/`kyc_verified_at` do dono) e filtrar client-side pelo mesmo conjunto de regras já aplicadas hoje, além do próprio `user_id === viewerId`.
  - Deduplicar por `creator_profile.id` e mapear para `CreatorRow` com o `username`/`display_name`/`avatar_url` do próprio `creator_profile` (não do `profiles`), para que free e pago apareçam com identidade correta.
  - `kyc_verified_at` continua vindo do `profiles` do dono (o selo é da pessoa).
- Ajustar a navegação do card: hoje `/perfil/$username` usa o `username` do profile raiz. Como perfis free têm username próprio em `creator_profiles`, o link do card passa a usar `creator_profile.username` — a rota `perfil.$username.tsx` já resolve via `resolve_active_creator_profile` por username, então basta passar o correto.
- Manter a lista "Mais buscados" (query vazia) ordenada por `created_at desc` da mesma forma, agora sobre `creator_profiles`.

### 2. `SubscribeDialog` respeita `cpf_required`
- Adicionar prop opcional `onCpfRequired?: () => void` em `src/components/payments/SubscribeDialog.tsx`. No `catch` do `submit`, se `e?.message === "cpf_required"`, chamar `onCpfRequired?.()` e retornar sem toast (o parent decide abrir o CpfPromptDialog e reabrir o SubscribeDialog).
- Em `src/routes/_authenticated/perfil.$username.tsx`:
  - Passar `onCpfRequired` para o `SubscribeDialog` que fecha o próprio dialog, guarda `setCpfPromptFor("SUBSCRIPTION")` (ou um marcador dedicado, ex.: `setCpfPromptForSubscription(true)`) e reabre o `SubscribeDialog` no `onSaved` do `CpfPromptDialog`.
  - Como o `CpfPromptDialog` atual chama `onSaved()` sem argumentos, adicionar um segundo state `pendingReopenSubscribe` que, quando `true`, reabre o `SubscribeDialog` (mantendo o `initialPlan` selecionado) após o CPF ser salvo.
- Nenhuma mudança em `createSubscriptionPayment` (o backend já lança `cpf_required` corretamente).

### Arquivos afetados
- `src/routes/_authenticated/search.tsx` — nova query e mapeamento por `creator_profiles`.
- `src/components/payments/SubscribeDialog.tsx` — nova prop `onCpfRequired`, tratamento no catch.
- `src/routes/_authenticated/perfil.$username.tsx` — estado extra para reabrir a assinatura após salvar CPF.

### Fora do escopo
- Não mexer no backend de pagamentos nem em RLS. As policies de leitura de `creator_profiles` já permitem SELECT público (usado hoje pelo `DashboardShell` e resolvers). Se o teste apontar bloqueio, adiciono a policy no follow-up.
