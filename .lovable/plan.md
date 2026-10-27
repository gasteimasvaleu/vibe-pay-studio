# Correção de segurança: tabela de perfis

## O que conferi no banco agora
- A regra de leitura real se chama `profiles_public_read` e vale para **visitantes sem login também** (anon + authenticated, `USING true`). É pior que o descrito: qualquer pessoa na internet lê CPF, endereço, chaves Asaas etc.
- A regra de edição real é `profiles_owner_update` (só `auth.uid() = user_id`, sem limitar colunas).
- `creator_profiles` também tem leitura aberta a todos (`public can view creator profiles`, `USING true`) — isso contradiz a regra da vitrine pública. Com `security_invoker = on`, a view `creator_profiles_search` vai herdar essa leitura aberta, então ela continua funcionando; mas incluo revisar as colunas expostas.
- 70 arquivos leem `profiles`; os principais: onboarding, payments, chat, profile, admin-dashboard, stats, publications, monetization, lives.
- Gravações de campos protegidos com o cliente do usuário: `cpf` (saved-cards, payments), `asaas_customer_id` (saved-cards, payments), `country` (geo.functions).

## Etapas
1. **Migração 1 — leitura**
   - Remover `profiles_public_read`; criar "dono lê a própria linha" e "admin lê tudo".
   - Criar view `profiles_public` (security_invoker off, dona do schema) com só colunas públicas: user_id, username, display_name, avatar_url, cover_url, bio, account_type, preços/descontos, flags públicas de exibição e `is_verified` (derivado de kyc_status). GRANT SELECT a anon e authenticated.
   - `ALTER VIEW creator_profiles_search SET (security_invoker = on)` e conferir colunas.
2. **Migração 2 — escrita**
   - Trigger BEFORE INSERT OR UPDATE em `profiles` bloqueando, para quem não é service_role nem admin: kyc_status, kyc_verified_at, banned_at, account_type, cpf, country, referred_by, asaas_customer_id/wallet_id/account_id/api_key_encrypted, veriff_session_id.
   - Mesmo trigger em `creator_profiles` para verified_at e kyc_status.
   - Conferir que os triggers existentes (handle_new_user, sync de preços, veriff) rodam como service/definer e não quebram.
3. **Código — leituras de outros usuários** passam para `profiles_public` (feed, perfil, busca, chat, lives, publicações, stats, amigos, creator-identity etc.). Leituras do próprio usuário ficam em `profiles`.
4. **Código — gravações protegidas** passam a usar o cliente admin depois de validar no servidor:
   - saved-cards e payments: cpf só grava se o atual for nulo; asaas_customer_id via admin.
   - geo.functions: country via admin.
   - onboarding e saveCreatorPayoutSetup: revisar e mover campos protegidos para admin.
   - settings.subscription (preços) continua direto.
5. **Testes** (script com sessão de um usuário comum): ler cpf de outros retorna vazio; update de kyc_status, banned_at, cpf, country dá erro; navegar perfil público, feed, busca, chat, onboarding, cadastro de cartão e recebimento sem erros.
6. Listar migrações e arquivos alterados.

## Riscos / pendências
- O cliente admin precisa da chave de serviço configurada no servidor (`APP_SUPABASE_SERVICE_ROLE_KEY`); vou confirmar que existe antes de mover gravações. Sem ela, cadastro de cartão e país quebram.
- Este projeto usa Supabase externo: não consigo logar automaticamente como usuário para testar. Os testes logados precisarão de uma conta de teste sua (ou você roda o script que eu deixar pronto).
- Quer que eu também feche a leitura aberta de `creator_profiles` (só colunas públicas via view)? Fica fora do escopo pedido; deixo anotado.
