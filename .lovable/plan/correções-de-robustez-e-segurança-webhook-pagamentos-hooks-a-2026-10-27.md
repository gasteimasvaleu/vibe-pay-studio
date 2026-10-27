# Correções de robustez e segurança (webhook, pagamentos, hooks agendados)

Escopo: só os 6 itens pedidos.

## 1. Webhook Asaas não perde mais eventos
`src/routes/api/public/webhooks/asaas.ts`: hoje, quando o evento já foi gravado, a resposta é "ok" na hora, mesmo que o processamento anterior tenha falhado. Passa a ser assim: se o evento já existe, consulta `asaas_events.processed_at`. Se estiver preenchido, responde "ok". Se estiver vazio, processa de novo normalmente. Os efeitos de pagamento continuam protegidos contra duplicação pelo item 2.

## 2. Pagamento nunca aplicado duas vezes
`src/lib/payments-reconcile.server.ts` (`applyPaidIntent`):
- antes de qualquer efeito, reserva o intent de forma atômica: só segue quem conseguir marcar `processing_started_at` enquanto `processed_at` estiver vazio e não houver reserva ativa;
- uma reserva com mais de 5 minutos é tratada como abandonada (processo que caiu) e pode ser retomada, para não travar o pagamento para sempre;
- se der erro durante os efeitos, a reserva é liberada (`processing_started_at = null`) e o erro segue, para o Asaas reenviar;
- quem não consegue a reserva retorna `false` sem fazer nada.

## 3. Status do pagamento só para o dono
`src/lib/payments.functions.ts` (`getPaymentIntentStatus`): se `metadata.buyerId` do intent não for o usuário logado, responde "intent não encontrado". Nada é consultado no Asaas e nada é reconciliado nesse caso.

## 4. Hooks agendados com secret próprio
`src/routes/api/public/hooks/dispatch-broadcasts.ts` e `subscription-reminders.ts`:
- deixam de aceitar a chave pública;
- passam a exigir o header `x-cron-secret`, comparado com `CRON_SECRET` por `crypto.timingSafeEqual`;
- respondem 401 se `CRON_SECRET` não estiver configurado ou não bater.

Configuração do secret e do agendamento (precisa de você, uma vez):
- vou pedir o `CRON_SECRET` num formulário seguro com botão **Gerar**. Você copia o valor gerado e salva;
- o agendamento fica no seu banco (pg_cron), e não consigo ler o valor salvo. Por isso te entrego um comando pronto para o Editor SQL do Supabase. Ele atualiza os dois jobs existentes (`dispatch-scheduled-broadcasts` e `subscription-reminders-daily`) para enviar `x-cron-secret: <valor>` no lugar da chave pública. Você só cola o valor e roda;
- até você rodar esse comando, os dois hooks vão recusar as chamadas: transmissões agendadas e lembretes de renovação ficam parados. Por isso faço essa troca por último, já com o comando em mãos.

## 5. Transmissão agendada enviada uma vez só
`dispatch-broadcasts.ts`: a reserva passa a ser `UPDATE ... SET status='running' WHERE id = ? AND status = 'scheduled'` com retorno da linha, **antes** de montar a lista de destinatários. Se nenhuma linha voltar, outro processo já pegou o job e ele é pulado.

## 6. release_matured_earnings
Confirmado: hoje qualquer pessoa (PUBLIC) pode executar. Revogo EXECUTE de PUBLIC, anon e authenticated. O job do pg_cron continua funcionando, porque roda como dono do banco.

## Migration (1)
- `payment_intents.processing_started_at timestamptz` (nulo por padrão).
- `REVOKE EXECUTE ON FUNCTION public.release_matured_earnings() FROM PUBLIC, anon, authenticated;` e `GRANT` para service_role.

## Arquivos alterados
- `src/routes/api/public/webhooks/asaas.ts`
- `src/lib/payments-reconcile.server.ts`
- `src/lib/payments.functions.ts`
- `src/routes/api/public/hooks/dispatch-broadcasts.ts`
- `src/routes/api/public/hooks/subscription-reminders.ts`

## Testes
- Hooks: chamada sem secret, com a chave pública ou com secret errado → 401.
- `getPaymentIntentStatus` com intent de outro usuário → recusado.
- Conferir no banco que `release_matured_earnings` não pode mais ser executada por anon.
- Dupla aplicação e reprocessamento do webhook: confiro pela leitura do código. Simular de verdade exigiria pagamentos reais no Asaas.
