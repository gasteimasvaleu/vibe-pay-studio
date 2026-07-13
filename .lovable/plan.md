## Objetivo
Alterar o background da seção de título da página (header abaixo da navbar superior) para `#FFFFFF` em todas as páginas do app.

## Contexto
O elemento selecionado está em `src/components/dashboard/DashboardShell.tsx` e usa `bg-card/80 backdrop-blur-md`. Várias outras páginas possuem headers idênticos ou similares com `bg-card/80`, `bg-background/80` e `backdrop-blur-md`.

## Escopo de alteração
Aplicar background `#FFFFFF` aos headers de **título de página** abaixo da navbar principal, removendo o efeito de transparência/blur onde presente.

Arquivos identificados para ajuste:
- `src/components/dashboard/DashboardShell.tsx`
- `src/routes/_authenticated/content-leak-report.tsx`
- `src/routes/_authenticated/vault.tsx`
- `src/routes/_authenticated/promotions.tsx`
- `src/routes/_authenticated/mywallet.extrato.tsx`
- `src/routes/_authenticated/follow.tsx`
- `src/routes/_authenticated/colecoes.tsx`
- `src/routes/_authenticated/my-monetisex-stats.tsx`
- `src/routes/_authenticated/settings.two-factor.setup.tsx`
- `src/routes/_authenticated/mywallet.recarregar.tsx`
- `src/routes/_authenticated/mywallet.index.tsx`
- `src/routes/_authenticated/settings.two-factor.index.tsx`
- `src/routes/_authenticated/settings.personal.tsx`
- `src/routes/_authenticated/settings.device-management.index.tsx`
- `src/routes/_authenticated/settings.myprofile.tsx`
- `src/routes/_authenticated/settings.details.tsx`
- `src/routes/_authenticated/bugreport.tsx`
- `src/routes/_authenticated/settings.creator.tsx`
- `src/routes/_authenticated/settings.muted.tsx`
- `src/routes/_authenticated/settings.theme.tsx`
- `src/routes/_authenticated/settings.device-management.removed.tsx`
- `src/routes/_authenticated/settings.subscription.tsx`
- `src/routes/_authenticated/settings.social.tsx`
- `src/routes/_authenticated/settings.change-password.tsx`
- `src/routes/_authenticated/settings.social-media.tsx`
- `src/routes/_authenticated/settings.privacy-options.tsx`
- `src/routes/_authenticated/settings.security.tsx`
- `src/routes/_authenticated/settings.privacy.tsx`
- `src/routes/_authenticated/settings.privacy-mail.tsx`
- `src/routes/_authenticated/banco.tsx` (header principal da página)
- `src/routes/_authenticated/banco.cadastrar.tsx`
- `src/routes/_authenticated/settings.restrictions.tsx`
- `src/routes/_authenticated/settings.chat-settings.tsx`
- `src/routes/_authenticated/settings.language.tsx`
- `src/routes/_authenticated/settings.security-menu.tsx`

## Fora de escopo (preservados)
- `src/components/site/TopNav.tsx` — navbar superior
- `src/components/site/Navbar.tsx` — navbar
- `src/components/site/AppTopBar.tsx` — top bar do app
- Headers de chat (`chat.tsx`, `chat.$threadId.tsx`)
- `OnboardingShell.tsx` e `perfil.$username.tsx` — usam estilo escuro próprio
- Sheet/modal internos (ex.: `banco.tsx` SheetHeader)

## Implementação
1. Substituir em cada header de página:
   - `bg-card/80 backdrop-blur-md` → `bg-white`
   - `bg-background/80 backdrop-blur-md` → `bg-white`
2. Manter `border-b border-border`, `relative z-10`, `sticky top-0` e outras classes estruturais intactas.
3. Verificar build/typecheck após as alterações.

## Validação
- `tsgo --noEmit` para garantir que não há erros de tipo.
- Verificação visual no preview para confirmar header branco na página selecionada e páginas de configurações.