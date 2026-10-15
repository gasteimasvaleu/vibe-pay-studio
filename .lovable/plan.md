# Trocar o modo de recebimento sem precisar zerar o saldo

## Resposta curta
Liberar a troca "do jeito simples" causaria problema, porque o dinheiro de cada modo fica em um lugar diferente:
- **Modo PIX:** o saldo fica na conta da plataforma, e o saque sai de lá.
- **Modo Asaas:** a parte do creator já caiu na conta Asaas dele, e o saque sai da conta dele.

O saque usa sempre o modo **atual** para saber de onde tirar o dinheiro. Depois de trocar:
- **PIX para Asaas:** o app tentaria sacar o saldo antigo da conta Asaas do creator, mas esse dinheiro está na conta da plataforma. O saque falha, e o saldo fica preso.
- **Asaas para PIX:** o app pagaria o creator com dinheiro da plataforma, mas esse valor já foi entregue a ele no Asaas. A plataforma pagaria duas vezes.

## A versão segura
1. **Cada venda guarda de onde veio o dinheiro** (modo PIX ou conta Asaas), já no momento da venda.
2. **O saldo aparece separado por origem** na tela Meu Banco, só quando houver as duas: "Saldo na plataforma" e "Saldo na sua conta Asaas", cada um com o liberado e o a liberar.
3. **Cada saque tira o dinheiro do lugar certo:** o saldo da plataforma é pago pela plataforma, e o saldo do Asaas sai da conta do creator. Isso vale para qualquer modo que ele esteja usando agora.
4. **A troca de modo é liberada na hora,** com um aviso: "Seu saldo atual continua disponível para saque. As vendas novas seguem o novo modo."
5. **Resto abaixo de R$ 50 no modo antigo:** pode ser sacado mesmo abaixo do mínimo, desde que seja todo o resto daquela origem. Assim nenhum valor fica preso.
6. **Vendas antigas:** são marcadas com a origem pelo modo que o creator usava na época. Hoje ninguém trocou de modo, então isso é seguro.

## Como verificar
- Na conta govitynow: trocar de PIX para Asaas com os R$ 64,22 a liberar. A troca deve funcionar, e o saldo deve continuar aparecendo como "na plataforma".
- Conferir que um saque desse saldo é feito pela plataforma, mesmo com o modo já em Asaas.

## Detalhes técnicos
- Adicionar `payout_source` (`platform` | `creator_asaas`) às transações, preenchido pelos triggers `*_sync_transaction` a partir de `payout_accounts.payout_mode`. Preencher as transações antigas com o modo atual de cada creator.
- `creator_wallets`: separar o liberado e o pendente por origem, ou calcular por agregação. Antes, conferir como o gatilho de liberação monta o saldo.
- `withdrawals`: nova coluna `source`. `requestWithdrawal` escolhe a chave Asaas pela origem, não pelo modo atual, e aceita valor abaixo de R$ 50 quando ele é igual a todo o saldo daquela origem.
- `saveCreatorPayoutSetup`: remover o bloqueio de saldo zero (linhas ~1344-1368 de `payments.functions.ts`).
- `banco.tsx` / `SacarDialog.tsx`: mostrar o saldo por origem e escolher a origem no saque.
