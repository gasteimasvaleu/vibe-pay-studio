# Saque PIX automático, sem você aprovar um por um

## Como funciona hoje
- O creator pede o saque e o app já cria a transferência PIX no Asaas.
- Depois que a transferência é criada, o app confere o CPF do dono da chave. Se não bater com o do creator, o app cancela a transferência.
- A transferência fica parada no Asaas até você aprovar manualmente no painel.

## O que precisa ser feito no Asaas (por você)
1. Pedir ao gerente da sua conta Asaas para desligar o token de autorização das transferências feitas pelo app. Normalmente ele pede uma lista de IPs liberados.
2. Pedir a ativação do "mecanismo de validação de saque". A partir daí, o Asaas consulta o app antes de enviar cada PIX.
3. Cadastrar no Asaas o endereço de validação que o app vai criar e um token secreto.

## O que muda no app
- O app cria um endereço que responde ao Asaas, em poucos segundos, se o saque pode sair ou não.
- O saque é aprovado sozinho apenas quando tudo isto vale:
  - existe no app um pedido de saque pendente com o mesmo valor;
  - o CPF do dono da chave PIX é igual ao CPF do creator;
  - o valor está dentro do limite por saque e do limite por dia;
  - o creator tem saldo liberado suficiente;
  - a conta do creator não está bloqueada nem banida.
- Se alguma regra falhar, o saque é recusado e o creator vê o motivo. Os casos acima do limite vão para você revisar no painel admin.
- Toda decisão, aprovada ou recusada, fica registrada no histórico do admin.
- No painel admin, você pode desligar a aprovação automática a qualquer momento. Com ela desligada, o fluxo manual atual volta a valer.

## Pontos para você decidir
- Limite por saque e limite por dia que podem sair sem sua aprovação.
- Se creators novos, com menos de X dias de conta, ficam sempre na aprovação manual.

## Detalhes técnicos
- Nova rota `src/routes/api/public/webhooks/asaas-transfer-validation.ts`. Ela valida o header de token contra um novo segredo `ASAAS_TRANSFER_VALIDATION_TOKEN` e responde `{ status: "APPROVED" | "REFUSED", refuseReason }`.
- O saque é localizado pelo `externalReference` da transferência. Será preciso enviar o id do saque em `createPixTransfer`.
- Novos campos em `platform_settings`: `auto_payout_enabled`, `auto_payout_max_cents` e `auto_payout_daily_max_cents`.
- Os eventos `TRANSFER_*` do webhook atual continuam atualizando o status do saque, como já fazem hoje.
- Testes com as regras de limite e de CPF.

Status: adiado. Depende da liberação do Asaas (itens 1 e 2).
