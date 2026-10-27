# Correção: liberação de conteúdo pago sem pagar

Objetivo: o fã não consegue mais criar nem alterar, por conta própria, compras, assinaturas, videochamadas, pedidos de mídia ou reembolsos. Só o servidor (checkout, webhook do Asaas, conferência de pagamentos) e o pagamento com saldo da carteira fazem isso. Nada fora deste escopo muda.

## Migração 1: acesso às tabelas
- **Compras de post, story, mensagem, ingresso de live e gorjetas**: removo as regras que deixam o usuário logado criar ou editar. A leitura das próprias compras continua.
- **Assinaturas**: removo criar e editar pelo assinante. A leitura continua.
- **Videochamadas**: removo a edição livre pelos participantes. Um gatilho define o preço na criação a partir das configurações do creator e ignora o valor enviado.
- **Pedidos de mídia na DM**: o solicitante só pode criar o pedido, com status pendente e sem pagamento. O banco confere o preço contra o mínimo do creator (`paid_dm_upload_min_cents`). A edição livre é removida.
- **Reembolsos**: troco a regra "gerenciar tudo" por "ver os próprios". O pedido passa a ser criado só pelo servidor.
- **Publicações**: um gatilho impede quem não é admin de mudar o status de moderação e os campos ligados a ele.
- **Gatilhos de cobrança** (`*_sync_transaction`): a regra "já tem transação, pula a cobrança" passa a valer só para o servidor e para o pagamento com carteira. Para qualquer outro, a gravação dá erro.

## Código
- **Checkout** (`payments.functions.ts`): hoje ele grava as compras pendentes com a sessão do próprio usuário. Isso vai quebrar quando as regras forem removidas. As gravações passam a usar o acesso de servidor, depois que o servidor confere quem é o comprador, o post e o preço vindos do banco. Isso vale para post, story, gorjeta, assinatura, mensagem, videochamada, mídia e ingresso.
- **Assinaturas** (`monetization.functions.ts`): apago `activateSubscription`. Cancelar a renovação vira uma função do servidor que muda só `auto_renew` e `cancelled_at`. `reactivateSubscription` passa a cobrar o preço atual do creator lido do banco.
- **Videochamada e mídia** (`chat-monetization.functions.ts`, `communication.functions.ts`): aceitar, recusar e cancelar viram funções do servidor que só mudam o status, e apenas em mudanças válidas (ex.: pendente para aceita; o creator aceita, o fã cancela). Pagamento, preço e transação ficam só com o servidor.
- **Reembolso**: `requestRefund` grava pelo servidor. Em `approveRefund`, o app ignora valor, cobrança e transação salvos no pedido. Ele recarrega a compra no banco, confirma que pertence a quem pediu e usa o valor real.
- **Funções antigas apagadas**: `activateSubscription`, `unlockPublication`, `tipCreator` (`monetization.functions.ts`), `unlockChatMessage` e `payVideoCall` (`communication.functions.ts`) e `topupSubscriberWallet` (`payouts.functions.ts`). Também removo os usos delas nas telas.

## Testes
- Via REST, sem login: tentar criar ou editar compras, assinaturas e videochamadas dá erro.
- Os testes logado como fã exigem uma conta de teste. Como o Supabase é externo, não consigo entrar logado sozinho. Vou deixar um roteiro pronto (supabase-js) para você rodar, ou você me passa um login de teste.
- O app precisa compilar sem erros. Faltam conferir os fluxos normais (Pix, cartão, carteira, assinatura, gorjeta, videochamada, DM paga, ingresso, reembolso). Eles dependem de pagamento real, então vou listar o que conferir.

## Riscos
- Se alguma tela ainda gravar direto nessas tabelas, ela passa a dar erro. Vou procurar e mover todas para o servidor.
- Compras pendentes antigas continuam válidas, e o webhook continua concluindo essas compras.

No final, listo as migrations e os arquivos alterados.
