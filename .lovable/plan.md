# Subcontas Asaas e saque PIX sem aprovação manual

## Como funciona hoje
- O split só acontece quando o creator informa o Wallet ID da conta Asaas dele.
- No modo "Só PIX", a venda entra 100% na conta da plataforma. Cada saque precisa ser aprovado manualmente por você no painel do Asaas.

## O que muda
1. **Subconta automática**: quando o creator termina a verificação de identidade, o app cria uma conta Asaas para ele com os dados já verificados. Assim ele passa a receber por split sem abrir conta por conta própria.
2. **Saque sem aprovação manual**: o Asaas passa a consultar o app antes de cada transferência PIX. O app libera sozinho os saques que cumprem as regras: CPF do titular igual ao do creator, valor dentro do limite e saldo suficiente. O que fugir das regras fica para você aprovar.

## Pontos a decidir antes de implantar
- Limite de valor por saque e por dia para liberar sem você aprovar.
- O que fazer com creators que já usam "Só PIX": migrar todos para subconta ou só os novos.
- Taxas do Asaas por subconta e por transferência.

## Detalhes técnicos
- `createSubaccount` / `findSubaccount` já existem em `asaas.server.ts`, mas nenhum código chama essas funções.
- Guardar `walletId` e `apiKey` da subconta em `payout_accounts` e definir `payout_mode = asaas_split`.
- Usar o webhook de autorização de transferências do Asaas em uma rota pública que verifica o token do Asaas.

Status: adiado na lista de tarefas.
