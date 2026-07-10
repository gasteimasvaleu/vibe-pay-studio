## Criar página `/settings/device-management/removed`

### Arquivos
1. **`src/routes/_authenticated/settings.device-management.removed.tsx`** (novo)
   - `createFileRoute("/_authenticated/settings/device-management/removed")` com `head` (title "Acessos removidos · Monetisexy", noindex) e `beforeLoad` verificando `supabase.auth.getUser()`.
   - Header padrão: botão voltar (ArrowLeft, `router.history.back()`), título centralizado "Acessos removidos".
   - **Estado vazio** (seguindo screenshot): card com fundo `bg-primary/10` (tom claro laranja/salmão), ícone Info circular do lucide (`text-primary`) à esquerda, texto "Nenhum acesso removido até agora. Assim que houver, você verá o histórico aqui." Layout `rounded-2xl p-4 flex items-start gap-3`.
   - Layout `max-w-3xl mx-auto px-4 md:px-6 py-6`.

2. **`src/routes/_authenticated/settings.device-management.tsx`** (editar)
   - Botão "Ver acessos removidos" (linha 96) vira `<Link to="/settings/device-management/removed">` no lugar do `<button onClick={soon}>`. Mantém mesmo estilo.
