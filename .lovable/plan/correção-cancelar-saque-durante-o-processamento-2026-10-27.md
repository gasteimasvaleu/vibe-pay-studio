# Correção: cancelar saque durante o processamento

Problema: enquanto o app espera o Asaas confirmar a transferência (até ~20s), o saque fica sem a referência do Asaas. Se o creator cancela nessa hora, o saque vira "rejeitado" sem cancelar no Asaas, o saldo volta e ele pode sacar de novo. No fim da espera, o app ainda sobrescreve o "rejeitado".

## O que muda (só em `src/lib/payouts.functions.ts`)

1. **Guardar a referência logo que a transferência é criada.** Logo depois de `createPixTransfer`, antes da checagem de CPF e da espera, grava `provider_ref = transfer.id` (admin, `.eq('id').eq('status','requested')`). Assim um cancelamento a partir desse momento só vale se o Asaas confirmar CANCELLED.
2. **Bloquear cancelamento na janela de criação.** Em `cancelWithdrawal`, saque `requested` sem `provider_ref` e com `requested_at` há menos de 5 minutos é recusado com "Saque em processamento. Tente cancelar em alguns minutos." Escolhi essa opção porque não precisa mudar o banco. Saque sem referência há mais de 5 minutos continua cancelável (caso de falha antes de criar a transferência).
3. **Atualização final sem sobrescrever.** A gravação depois da espera passa a usar `.eq('status','requested')`, então "rejeitado", "falha" ou "pago" nunca são trocados. O mesmo filtro já existe no bloco de erro.
4. **Regra mantida:** com `provider_ref`, `cancelWithdrawal` só marca "rejeitado" depois de o Asaas confirmar CANCELLED.

Nada muda fora desse arquivo: sem migration, sem mudança de tela.

## Teste

- Rodar um script que pede o saque e chama `cancelWithdrawal` em paralelo exige saldo real e uma transferência PIX real no Asaas, então não vou rodar sem o seu ok.
- Vou conferir a lógica revisando os caminhos: cancelamento antes da referência (recusado), depois da referência (só com CANCELLED no Asaas), e atualização final depois de um cancelamento (não sobrescreve). E confirmar que o app compila.
