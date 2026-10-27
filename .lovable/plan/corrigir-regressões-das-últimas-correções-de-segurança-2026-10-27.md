# Corrigir regressões das últimas correções de segurança

Confirmado agora no banco e no código:
- `recordIntent` não grava o comprador por padrão, e `getPaymentIntentStatus` recusa quando falta, então só a recarga confirma sozinha.
- `admin_unblock_wallet` grava o id como texto num campo uuid.
- Os 2 agendamentos (jobs 3 e 4) **já enviam** o `x-cron-secret`: o secret tem 48 caracteres e não é o "COLE_AQUI".
- A trava única de `asaas_customer_id` existe, a última migration (lives/chat) está aplicada e não há clientes Asaas duplicados.
- Nenhum token de cartão aparece em mais de uma conta.
- O webhook marca `processed_at` também em eventos que não são finais (criado, autorizado, em análise, split).

## 1. Tela de aguardando pagamento
- `recordIntent` passa a exigir e gravar o comprador em todas as 11 chamadas (post, story, assinatura, gorjeta, chat, videochamada, DM, live, recarga etc.).
- `getPaymentIntentStatus`: se o pedido antigo não tem comprador, confere o dono pela compra referenciada (`buyer_id` / `subscriber_id` / `requester_id`, conforme a tabela). Sem dono confirmado, continua recusando.

## 2. Desbloquear carteira
- Migration: `admin_unblock_wallet` grava o id como uuid no log de auditoria.

## 3. Agendamentos
- Não precisa mudar nada: os dois já mandam o header. Vou mostrar a lista de `cron.job` com o secret escondido.

## 4. Ações de admin
- `banUser`/`unbanUser`, `setKycStatus`, `moderatePublication`, `approveWithdrawal`/`rejectWithdrawal`: conferem o papel com o cliente do usuário e gravam com o cliente de servidor.
- Moderação de post aceita admin ou moderador. Banir, KYC e saque ficam só para admin.

## 5 e 6. Conferências (só leitura)
- Já feitas: tudo aplicado, sem duplicados. Como não há cartões copiados, não há pagamentos com cartão copiado para listar.

## 7. Webhook Asaas
- `processed_at` do pedido só é preenchido em estado final (pago, estornado, cancelado). Autorizado, em análise, criado e split só atualizam o tipo do evento.
- Erros ao gravar o status da compra (`markStatus`) ou do saque passam a retornar 500, e o Asaas reenvia.

## Testes
- Pagar post com Pix e cartão, desbloquear carteira, banir/desbanir, moderar e aprovar saque dependem de login, e o Supabase deste projeto não me deixa entrar como usuário. Vou testar o que der pelo banco simulando um admin (desbloqueio de carteira, com tudo desfeito no fim) e confirmar que compila. O resto fica para você testar no app.

## Detalhes técnicos
- Arquivos: `src/lib/payments.functions.ts`, `src/lib/admin.functions.ts`, `src/lib/admin-dashboard.functions.ts`, `src/routes/api/public/webhooks/asaas.ts`, e `src/routes/api/public/webhooks/payments-reconcile.server.ts` se o caminho de pagamento também marcar processed_at cedo.
- Migration 1: recriar `admin_unblock_wallet` com `target_id := _user_id`.
- `markStatus` e `applyTransferStatus` passam a checar `error` e lançar exceção, o que leva ao 500.
