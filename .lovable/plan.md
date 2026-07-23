## Objetivo
Adicionar à página existente `/colecoes` uma aba **"Reembolsos"** e botões de **"Solicitar reembolso"** na aba "Minhas Compras", permitindo que o usuário peça e acompanhe reembolsos. No admin, criar interface para aprovar/rejeitar e executar o estorno no Asaas.

## Onde fica `/colecoes` hoje
- Acessível pelo dashboard do assinante e do creator no card **"Atividades"**.
- Já tem as abas: Favoritos, Minhas Compras, Compras Chat, Ocultados, Mimos.

## O que será feito

### 1. Banco de dados
- Criar tabela `public.refund_requests`:
  - `id` uuid PK
  - `user_id` uuid -> auth.users
  - `reference_type` enum: `publication_unlock`, `chat_message_unlock`, `subscription`, `tip`
  - `reference_id` uuid
  - `transaction_id` uuid -> transactions (opcional)
  - `amount_cents` int
  - `reason` text
  - `status` enum: `pending`, `approved`, `rejected`, `cancelled`
  - `admin_notes` text
  - `asaas_payment_id` text
  - `created_at`, `updated_at`, `resolved_at`
- GRANTs e RLS:
  - Usuário vê/cria/atualiza apenas seus próprios pedidos.
  - Admin vê/atualiza todos.
- Adicionar coluna `asaas_payment_id` nas tabelas `publication_unlocks`, `chat_message_unlocks`, `subscriptions` e `tips` (onde ainda não existir), populada no pagamento.

### 2. Backend
- Criar `src/lib/refunds.functions.ts`:
  - `requestRefund`: valida se a compra pertence ao usuário, se não foi reembolsada, se está dentro do prazo (7 dias corridos), cria pedido `pending`.
  - `cancelRefundRequest`: usuário cancela pedido `pending`.
  - `listMyRefundRequests`: lista pedidos do usuário com dados da compra.
- Criar `src/lib/admin-refunds.functions.ts` (protegido por role admin):
  - `listPendingRefunds`: pedidos pendentes com comprador e criador.
  - `approveRefund`: aprova, chama `refundPayment` no Asaas, atualiza transação original para `refunded` e reverte saldo do criador.
  - `rejectRefund`: rejeita com nota do admin.

### 3. Frontend — Aba Reembolsos em `/colecoes`
- Adicionar nova tab `reembolsos` no array `TABS`.
- Na aba "Minhas Compras" e "Compras Chat", adicionar botão/menu "Solicitar reembolso" em itens elegíveis:
  - comprado há até 7 dias;
  - status `paid`;
  - sem pedido pendente/aprovado.
- Abrir `Dialog` com motivos pré-definidos e campo de texto.
- Aba "Reembolsos" mostra lista com status, valor, data e botão "Cancelar" para pedidos pendentes.
- Atualizar query keys para invalidar listas após solicitação/cancelamento.

### 4. Frontend — Admin
- Adicionar seção "Reembolsos" no dashboard admin (`/admin`):
  - Lista de pedidos pendentes.
  - Ações: Aprovar (com confirmação) / Rejeitar (com nota).
  - Histórico de pedidos resolvidos.

### 5. Regras de negócio
- Prazo de solicitação: 7 dias corridos após a compra.
- Mimos não são reembolsáveis (conforme termos) e não terão botão.
- Assinaturas: apenas ciclo atual pago e não utilizado pode ser reembolsado.
- Ao aprovar:
  - Chamar Asaas `refundPayment`.
  - Marcar registro original como `refunded`.
  - Reverter saldo do criador em `transactions`.
  - Enviar e-mails transacionais para comprador e criador.

### 6. Navegação
- Manter acesso atual pelo dashboard via card "Atividades".
- Considerar renomear o card para "Compras e Atividades" ou adicionar card separado "Minhas Compras" no dashboard (a decidir na implementação).

## O que não será alterado
- A rota `/colecoes` continua existindo.
- Termos de uso já tratam reembolso; nenhuma alteração textual necessária.

## Próximos passos
1. Aprovar escopo e prazo de 7 dias.
2. Criar migration de banco.
3. Implementar server functions.
4. Implementar aba e dialogs no frontend.
5. Implementar painel admin.
6. Testar fluxo end-to-end no Asaas sandbox.