## Correção: headers das páginas `/settings/*` no tema escuro

**Problema:** os headers de 23 páginas em `src/routes/_authenticated/settings.*.tsx` usam `bg-white` fixo, que não responde ao dark mode e deixa o header branco sobre fundo escuro. O texto interno usa `text-foreground` — que no dark mode fica claro sobre esse branco, tornando-se ilegível.

**Correção:** substituir `bg-white` por `bg-card` (token semântico já usado no resto do app), que é branco no tema claro e escuro no tema escuro. O `text-foreground` continua funcionando automaticamente em ambos temas contra `bg-card`, então não é preciso alterar cores de fonte.

**Arquivos afetados (23):**
`settings.change-password.tsx`, `settings.chat-settings.tsx`, `settings.creator.tsx`, `settings.details.tsx`, `settings.device-management.index.tsx`, `settings.device-management.removed.tsx`, `settings.language.tsx`, `settings.muted.tsx`, `settings.myprofile.tsx`, `settings.personal.tsx`, `settings.privacy-mail.tsx`, `settings.privacy-options.tsx`, `settings.privacy.tsx`, `settings.restrictions.tsx`, `settings.security-menu.tsx`, `settings.security.tsx`, `settings.social-media.tsx`, `settings.social.tsx`, `settings.subscription.tsx`, `settings.theme.tsx`, `settings.two-factor.index.tsx`, `settings.two-factor.setup.tsx`, `settings.two-factor.verify.tsx`.

**Execução:** `sed -i 's/bg-white/bg-card/g'` em todos os arquivos acima (cada um contém exatamente uma ocorrência, sempre no header).
