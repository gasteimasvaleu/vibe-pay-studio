
## Diagnóstico do painel atual

Hoje `/admin` tem 9 abas: **Visão geral, Transações, Usuários (ban/unban + refresh KYC), Saques, Reembolsos, Moderação (denúncias), Vazamentos, Bugs, E-mails**.

Existem server functions já prontas **mas sem UI**:
- `grantRole` / `revokeRole` (promover admin/moderador)
- `setKycStatus` (override manual de KYC)
- `moderatePublication` (esconder/remover post específico)
- `listAuditLogs` (trilha de auditoria)

E há áreas do app **sem qualquer controle administrativo**: Lives, Stories, Broadcasts, Videochamadas, Blog, Central de Ajuda, Troféus, Assinaturas, Promoções, Reconciliação Asaas, Sessões ativas, Conteúdo do banido e Configurações globais.

## Plano — novos módulos do painel

### 1. Detalhe do usuário `/admin/users/$userId`
Drill-down ao clicar no `@username` da tabela: perfis vinculados, roles (com botões **Promover admin/moderador / Revogar**), KYC (override para `verified/rejected/processing`), carteiras (subscriber + creator), últimas 50 transações, assinaturas ativas, sessões ativas com **Revogar sessão** e **Revogar todas**, publicações/stories/lives e botão **Excluir todo conteúdo** (usado em conjunto com o ban).

### 2. `/admin/lives` e `/admin/stories`
Lista com filtros (ao vivo, agendadas, encerradas / ativas, expiradas). Ações: **Ver player**, **Encerrar live** (força `ended_at` + fecha input Cloudflare), **Ocultar/Remover story ou live** com registro em `audit_logs` e motivo.

### 3. `/admin/broadcasts` e `/admin/videocalls`
- Broadcasts: status de cada job (`broadcast_jobs`), destinatários, receita, botão **Cancelar** enquanto `queued`.
- Videochamadas: fila (`video_calls`), sala Daily, status de pagamento, botão **Encerrar** e **Reembolsar** (chama fluxo existente).

### 4. `/admin/subscriptions` e `/admin/promotions`
Listar assinaturas ativas com filtros por criador/assinante, botões **Cancelar renovação** e **Encerrar imediatamente** (aciona Asaas). Listar promoções ativas com opção de **Pausar/Encerrar** override.

### 5. `/admin/reports` — expansão do módulo Moderação
Manter a aba Moderação atual, mas quando o alvo for `publication`/`profile`/`chat_message` mostrar o conteúdo em preview e **botões contextuais**: **Ocultar publicação**, **Remover publicação**, **Silenciar autor**, **Banir autor**, **Apagar mensagem**. Chama `moderatePublication` já existente e novas fns pequenas para chat/profile.

### 6. `/admin/trophies`
UI para `trophy_requests`: aprovar/rejeitar/marcar como enviado com notas admin. Fluxo já existe no lado creator, falta a contraparte admin.

### 7. `/admin/finance`
Sub-abas:
- **Reconciliação Asaas**: inspecionar `asaas_events` e `payment_intents`, reprocessar evento (rechamar webhook handler), marcar transação manual como paga/refunded.
- **Auditoria**: viewer de `audit_logs` (já tem fn `listAuditLogs`) com filtros por actor/action/target.

### 8. `/admin/content` (Blog + Central de Ajuda)
CRUD para `blog_posts`, `blog_categories`, `help_categories`, `help_sections`, `help_articles` (editor markdown/HTML simples). Hoje só existem via SQL.

### 9. `/admin/settings`
Painel global: taxas (comissão nacional/internacional, gateway), limites de saque, valor mínimo de PPV/DM/videochamada, toggles de features (lives, broadcasts). Persistidos numa nova tabela `platform_settings` (single row) lida pelas server fns existentes.

### 10. Navbar do admin
Reorganizar em grupos (Financeiro / Usuários / Conteúdo / Suporte / Sistema) para caber os novos itens sem overflow horizontal.

## Detalhes técnicos

- **Backend**: novas server fns em `src/lib/admin-*.functions.ts` cobrindo listagens/ações; todas gateadas por `requireAdminAccess` + gravam `audit_logs`. Ações destrutivas exigem motivo (≥3 chars) igual ao fluxo de ban.
- **SQL**: 
  - nova tabela `platform_settings` (jsonb) com RLS **admin-only** + seed default;
  - índices `audit_logs(actor_id, created_at)`, `broadcast_jobs(status)`, `video_calls(status, created_at)`, `live_sessions(status)` para as listagens.
- **RLS**: novas policies `admin can select` (via `has_role(auth.uid(),'admin')`) em `asaas_events`, `payment_intents`, `broadcast_jobs`, `video_calls`, `live_sessions`, `trophy_requests` — hoje algumas dessas negam SELECT geral.
- **Frontend**: cada nova rota segue o padrão `_authenticated/admin.*.tsx` já usado (Card + tabela + filtros pill + `useQuery`), reusando `AlertDialog` para confirmações destrutivas.
- **Auditoria**: toda ação admin (ban, override KYC, moderar post, encerrar live, cancelar assinatura, reprocessar webhook, editar settings) chama helper `logAudit(action, target_table, target_id, metadata)`.

## Ordem de entrega sugerida

1. Detalhe do usuário + gestão de roles + KYC override + audit viewer (destranca operação diária).
2. Moderação expandida (ações contextuais em denúncias) + Lives/Stories.
3. Reembolsos↔Reconciliação Asaas + Assinaturas/Promoções + Videochamadas/Broadcasts.
4. Troféus + Blog/Central de Ajuda + Settings globais + reorganização da nav.

Cada etapa é um PR independente que já deixa o painel utilizável antes da próxima.
