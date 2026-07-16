## Contexto

A página `/settings/two-factor` já detecta o fator TOTP verificado e mostra um botão **Desativar** quando ativo (usa `supabase.auth.mfa.unenroll`). Só que hoje é um botão outline "cru", sem confirmação e sem separação visual entre "desativar" e "remover".

Como no Supabase MFA só existe uma operação (`unenroll`) — que ao mesmo tempo desabilita o 2FA e apaga o fator do `auth.mfa_factors` — não faz sentido ter dois botões distintos. Vou reforçar essa única ação, mas com UX de página de "gerenciar 2FA".

## Mudanças em `/settings/two-factor` (quando ativa)

- Cartão de status atualizado: bolinha verde/roxa + "Ativa" + linha secundária "Adicionada em {data}" (usando `factor.created_at` de `listFactors`).
- Bloco separado "Zona de perigo" (borda `border-destructive/30`, fundo sutil) com:
  - Título **"Remover autenticação de dois fatores"**
  - Descrição curta: "Isso desativa o 2FA e remove o app autenticador da sua conta. Você poderá cadastrar novamente a qualquer momento."
  - Botão **"Remover 2FA"** em `variant="destructive"`, largura total.
- Ao clicar, abrir um `AlertDialog` (shadcn já disponível) confirmando: "Tem certeza que deseja remover?" com botões **Cancelar** / **Remover**.
- Confirmado: chama `mfa.unenroll({ factorId })`, `toast.success("2FA removido")`, `refresh()`.
- Estado `busy` desabilita o botão durante a chamada; erro exibe `toast.error`.

## Sem mudanças

- Estado "não configurada" continua igual (botão **Habilitar** → `/setup`).
- Não mexer nas rotas `setup` nem `verify`.
- Sem migração — Supabase gerencia `auth.mfa_factors`.

## Arquivo

- edit `src/routes/_authenticated/settings.two-factor.index.tsx` — adiciona bloco "Zona de perigo" com `AlertDialog` de confirmação e exibe data de cadastro do fator.
