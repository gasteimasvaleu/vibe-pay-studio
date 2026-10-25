# Para depois: subcontas Asaas e saque PIX sem aprovação manual

Situação atual: o app não cria subcontas Asaas. Hoje o split só acontece quando o creator cadastra o Wallet ID da conta Asaas dele. No modo "Só PIX", a venda entra 100% na conta da plataforma, e cada saque precisa ser autorizado manualmente no painel do Asaas.

## Ideias para implantar depois
1. **Subconta automática**: ao concluir a verificação, o app cria uma conta Asaas para o creator com os dados do KYC e guarda o Wallet ID. Assim, todos os creators recebem por split sem precisar abrir conta por conta própria.
2. **Saque sem aprovação manual**: configurar no Asaas a liberação automática de transferências, com limites de valor e validação do CPF pelo app.

## Detalhes técnicos
- `createSubaccount` / `findSubaccount` já existem em `asaas.server.ts`, mas não são chamados em nenhum lugar.
- Guardar `walletId` e `apiKey` da subconta em `payout_accounts` e definir `payout_mode = asaas_split`.
- Avaliar o webhook de autorização de transferência do Asaas como alternativa à aprovação manual.

Status: adiado, nada será implementado agora.
