## Objetivo

Substituir o QR code / código estáticos por 2FA real usando **Supabase Auth MFA (TOTP)** e adicionar a segunda etapa (tela de verificação do código de 6 dígitos, screenshot 2) que efetivamente habilita o fator.

Como é TOTP padrão (RFC 6238), funciona com **qualquer autenticador**: Google Authenticator, Authy, 1Password, Microsoft Authenticator, Duo Mobile, etc.

## Fluxo real

1. `/settings/two-factor` (index) — em vez de status hardcoded "Não configurada", ler `supabase.auth.mfa.listFactors()` no client. Se já houver um fator TOTP `verified`, mostrar "Ativa" + botão **Desativar** (chama `mfa.unenroll({ factorId })`). Se não, botão **Habilitar** leva para `/settings/two-factor/setup`.

2. `/settings/two-factor/setup` (screenshot 1) — passa a ser real:
   - Ao montar: limpar fatores TOTP `unverified` órfãos (listFactors → unenroll dos não verificados) e chamar `supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Monetisexy' })`.
   - Renderizar o `data.totp.qr_code` (SVG data URL que o próprio Supabase devolve) no lugar do QR gerado com `qrcode`.
   - Mostrar `data.totp.secret` no input com botão copiar (já existe).
   - Guardar `factorId` em `useState`.
   - Botão **Avançar** → `navigate({ to: '/settings/two-factor/verify', search: { factorId } })`. Cancelar/voltar → `mfa.unenroll({ factorId })` para não deixar fator pendente.

3. Nova rota `/settings/two-factor/verify` (screenshot 2):
   - Novo arquivo `src/routes/_authenticated/settings.two-factor.verify.tsx`.
   - `validateSearch` com `factorId: z.string()`.
   - Header idêntico às outras telas de settings (voltar + título "Autenticação de Dois Fatores").
   - **Barra de progresso roxa (etapa 2/2)** — usa a cor primária do app (`bg-gradient-primary` / `bg-primary` conforme o token roxo definido em `src/styles.css`), não laranja como no screenshot de referência.
   - Título **"Insira o código de validação"** + subtítulo **"Digite o código gerado pelo seu aplicativo autenticador para prosseguir na autenticação"**.
   - Campo grande estilo "floating label" com label "Código de validação" e input numérico de 6 dígitos (inputMode `numeric`, maxLength 6, autofocus), ícone de QR à direita (decorativo).
   - Botão fixo no rodapé **"Habilitar Autenticação"** (`w-full h-14 bg-gradient-primary`), desabilitado enquanto código não tiver 6 dígitos ou enquanto `verifying`.
   - Ao clicar: `mfa.challenge({ factorId })` → `mfa.verify({ factorId, challengeId, code })`. Em sucesso: `toast.success('2FA ativado')` + `navigate({ to: '/settings/two-factor' })`. Em erro (código inválido / expirado): `toast.error` e limpar campo.

4. Sem novas tabelas nem migração — Supabase Auth guarda os fatores em `auth.mfa_factors`.

## Detalhes técnicos

- Tudo client-side com `supabase.auth.mfa.*`; nenhum server function necessário (o token do usuário basta).
- Remover o import de `qrcode` do `settings.two-factor.setup.tsx` (usa o SVG do Supabase).
- `SECRET_CODE` hardcoded é removido; o secret real vem de `enroll()`.
- Cleanup de fatores `unverified` no mount do setup evita acúmulo se o usuário sair no meio.
- MFA nível AAL2: após `verify` bem-sucedido, a sessão do próprio dispositivo sobe pra AAL2 automaticamente.
- Cores: a barra de progresso e o botão principal usam os tokens roxos já existentes (`--primary` / `bg-gradient-primary`) — nenhuma cor hardcoded.

## Arquivos

- edit `src/routes/_authenticated/settings.two-factor.index.tsx` — status real via `listFactors`.
- edit `src/routes/_authenticated/settings.two-factor.setup.tsx` — usa `mfa.enroll`, QR do Supabase, avançar leva pra `/verify?factorId=...`.
- new  `src/routes/_authenticated/settings.two-factor.verify.tsx` — tela do screenshot 2 com barra de progresso roxa, chama `challenge` + `verify`.
