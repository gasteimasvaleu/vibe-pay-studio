## Contexto técnico apurado

- **Auth/roles**: enum `app_role` = `admin | moderator | creator | subscriber`; tabela `user_roles`; função `has_role(_user_id, _role)`. Middleware server-side já existe (`requireRole` em `src/lib/admin.functions.ts`).
- **Backend admin já pronto (`src/lib/admin.functions.ts`, 291 linhas)**: `reportContent`, `listOpenReports`, `resolveReport`, `moderatePublication`, `approveWithdrawal`, `rejectWithdrawal`, `grantRole`, `revokeRole`, `setKycStatus`, `listAuditLogs`. Falta apenas a camada de UI e algumas funções agregadas.
- **Faltando no backend**: (a) agregações financeiras globais (GMV, fees, saldos); (b) listagem admin de transações e usuários; (c) coluna de banimento em `profiles` (`banned_at`, `ban_reason`).
- **Navbar**: `src/components/site/AppTopBar.tsx` — inserir ícone admin entre "Sair" (linha 69) e o avatar (linha 76), condicionado ao role.
- **User admin**: `caiorobbb@gmail.com` → `user_id = ef28932d-d010-4904-8349-dac4a73758a5` (confirmado em auth.users).

## Arquitetura

```text
/admin (layout com gate has_role('admin'))
├── /admin                → visão geral (KPIs + atalhos)
├── /admin/financeiro     → GMV, fees, saldos, gráfico de receita
├── /admin/transacoes     → explorer de transactions + payment_intents
├── /admin/saques         → fila withdrawals (pending/paid/rejected)
├── /admin/usuarios       → busca, roles, KYC, ban/unban
├── /admin/moderacao      → fila content_reports + moderar publicações
└── /admin/auditoria      → audit_logs (histórico de ações admin)
```

Gate: pathless layout `src/routes/_authenticated/admin/route.tsx` com `beforeLoad` que chama uma server fn `requireAdmin()` (usa `requireSupabaseAuth` + `has_role`). Redireciona para `/dashboard` se não for admin.

## Passos de implementação

### 1. Migration (schema + seed)
- Adiciona `profiles.banned_at TIMESTAMPTZ`, `profiles.ban_reason TEXT`.
- Cria função `admin_is_banned(_uid uuid) RETURNS boolean` (security definer) para reutilizar em RLS futuras.
- **Seed único**: `INSERT INTO user_roles (user_id, role) VALUES ('ef28932d-...', 'admin') ON CONFLICT DO NOTHING`.
- Cria view/função `admin_financial_summary(_from, _to)` que retorna GMV, platform_fee_total, gateway_fee_total, net_total, contagem por método (agrega `transactions` sem filtro por creator) — security definer, executável só por role admin.

### 2. Novas server functions em `src/lib/admin.functions.ts`
- `requireAdmin` (helper reutilizável para o `beforeLoad`).
- `getFinancialOverview({ from, to })` → chama `admin_financial_summary` + soma `creator_wallets` e `subscriber_wallets`.
- `listAdminTransactions({ filters, page })` — filtros: método, status, kind, período, busca por buyer/creator username.
- `listAdminUsers({ q, role?, kyc?, banned?, page })` — join `profiles + user_roles + auth.users.email`.
- `banUser({ userId, reason })` / `unbanUser({ userId })` — set/reset `banned_at`; grava audit_log.
- `listAdminWithdrawals({ status })` (envolve `withdrawals` + dados do creator/payout_accounts).
- `listAllReports({ status })` — versão paginada de `listOpenReports`.

### 3. UI

- **Layout admin** `src/routes/_authenticated/admin/route.tsx`: sidebar lateral esquerda com navegação entre as sub-rotas, header simples "Admin · Monetisexy". Reusa componentes shadcn existentes (Card, Table, Badge, Tabs).
- **Overview `/admin`**: 4 KPIs (GMV 30d, Taxa da plataforma 30d, Saques pendentes, Reports abertos) + gráfico de receita diária (ComposedChart, mesmo estilo já usado em stats — roxo para faturamento, cinza para quantidade).
- **Financeiro**: seletor de período + tabela por método + gráfico + card de saldos totais em carteiras.
- **Transações**: DataTable com filtros (kind, method, status, período, busca), export CSV client-side.
- **Saques**: 3 abas (Pendentes / Pagos / Rejeitados). Card por saque com botões "Marcar como pago" e "Rejeitar" (dialog com motivo). Já 100% automático via wallet id — esta tela é para monitoramento e intervenção manual em casos-borda.
- **Usuários**: busca por username/email, filtros por role/KYC/banned. Ações no drawer lateral: grant/revoke role, aprovar/reprovar KYC, banir/desbanir. Link para `/perfil/:username`.
- **Moderação**: 2 abas — "Reports" (fila) e "Publicações denunciadas". Ações: marcar report como actioned/dismissed, aprovar/ocultar/remover publicação com nota.
- **Auditoria**: tabela paginada de `audit_logs` com filtro por actor e action.

### 4. Ícone na navbar
- Em `src/components/site/AppTopBar.tsx`: buscar role atual via `useQuery` (nova server fn leve `getMyRoles()` já retornando `{ isAdmin, isModerator }`).
- Se `isAdmin`, renderizar `<Link to="/admin"><ShieldCheck /></Link>` entre o botão "Sair" e o avatar (linha ~75), no mesmo estilo dos outros ícones (círculo, hover accent, tooltip "Admin").

### 5. Enforcement do ban
- Ao logar/carregar sessão: se `profiles.banned_at IS NOT NULL`, `onAuthStateChange` no root redireciona para `/conta-suspensa` (nova rota pública mínima com o motivo).
- Server functions críticas (`monetization`, `payments`, `publications`) recebem check `if (banned) throw`.
- (Fora do v1: bloqueio via RLS em cada tabela — pode ser adicionado depois se necessário.)

## Fora do escopo v1
- Lives (tabelas existem mas sem UI no app inteiro — precisa ser tratado como feature separada).
- Feature flags/configurações globais (não há tabela hoje).
- Videochamadas admin (server fn de pagamento existe, mas sem UI de app).
- Impersonate/login-as-user.

## Detalhes técnicos importantes
- Layout `_authenticated/admin/route.tsx` NÃO altera o gate `_authenticated/route.tsx` (integração-managed). Apenas adiciona segunda checagem por role.
- Todas as server functions admin usam `requireSupabaseAuth` + `has_role` — nunca `supabaseAdmin` para autorizar. `supabaseAdmin` é usado apenas depois de confirmado o role, para operações que precisam bypassar RLS (ex.: listar transactions de todos os users).
- Toda ação de escrita chama `logAudit()` para trilha em `audit_logs`.
- Rota `/admin/*` fica em `_authenticated/`, então herda auto-bearer middleware e gate de sessão existentes.
