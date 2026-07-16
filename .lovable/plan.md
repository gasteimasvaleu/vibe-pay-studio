## Objetivo

Tornar `/settings/social-media` funcional: carregar handles atuais, salvar em `profiles`, e vincular os ícones do card de perfil (`perfil/$username`) aos links reais.

## Mudanças

### 1. Migração — adicionar `profiles.x_handle`
- Já existem `instagram_handle` e `tiktok_handle`.
- Nova coluna `x_handle text` com check de tamanho ≤ 30.

### 2. Server function `updateSocialLinks` em `src/lib/profile.functions.ts`
- Middleware `requireSupabaseAuth`.
- Input: `{ instagram: string; tiktok: string; x: string }`.
- Sanitiza cada valor (`[^a-z0-9_.]` removido, ≤ 30 chars, lowercase); vazio → `null`.
- `update({ instagram_handle, tiktok_handle, x_handle })` no perfil do usuário.

### 3. `settings.social-media.tsx`
- `beforeLoad`: carregar `instagram_handle`, `tiktok_handle`, `x_handle` e passar como context.
- Estados iniciam com os valores atuais; `dirty` compara com iniciais.
- Substituir a barra fixa inferior por dois botões em fluxo (mesmo padrão de `settings.details.tsx`):
  - **Salvar** — `w-full bg-primary text-primary-foreground hover:bg-primary/90`, `disabled={!dirty || saving}`. Chama `updateSocialLinks`, `toast.success`, atualiza iniciais, `router.invalidate()`.
  - **Cancelar** — mesmo estilo, `disabled={!dirty || saving}`, restaura valores iniciais.
- Remover `pb-28`.

### 4. Card do perfil (`perfil.$username.tsx`)
- Loader: incluir `instagram_handle`, `tiktok_handle`, `x_handle` no `.select` e expor como `instagram`, `tiktok`, `x` em `profile`.
- `SocialButton` passa a aceitar `href` opcional: quando presente, renderiza `<a target="_blank" rel="noopener noreferrer">`; quando ausente, renderiza `<button disabled>` com `opacity-50`.
- URLs: `https://instagram.com/{handle}`, `https://www.tiktok.com/@{handle}`, `https://x.com/{handle}`.

Sem outras mudanças.
