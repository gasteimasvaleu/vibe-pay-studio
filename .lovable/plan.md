# Recebimento híbrido: Split Asaas + opção "Só PIX"

## Recomendação
Manter o split para quem já tem conta Asaas (mais seguro: o dinheiro do creator nunca fica com a plataforma) e adicionar a opção **"Receber por PIX"** para quem não quer abrir conta Asaas, como no Fatalfans. Assim o cadastro fica fácil e quem já usa o split continua igual.

## Como fica para o creator
- Em **Meu Banco → Dados de recebimento**, ele escolhe:
  - **Conta Asaas (split)**: o fluxo atual.
  - **Chave PIX**: informa uma chave PIX ligada ao **mesmo CPF da verificação** (o app confere isso).
- No modo PIX, o saldo dele aparece no Meu Banco da mesma forma (liberado / a liberar).
- No saque, a plataforma envia o PIX da conta dela para a chave dele. Status iguais aos de hoje ("Aguardando autorização" → "Concluído").

## Regras
- Chave PIX precisa ser do mesmo CPF do KYC (contra fraude).
- Mesmo prazo de liberação e saque mínimo de hoje.
- Trocar de modo só com saldo zerado, para não misturar contas.
- Admin vê no painel os saques "Só PIX" pendentes e o total que a plataforma deve aos creators.

## Detalhes técnicos
- Coluna `payout_mode` ('asaas_split' | 'pix') e `pix_key`/`pix_key_type` nos dados bancários do creator.
- Cobranças: sem `creatorWalletId` quando o modo for 'pix' (100% entra na plataforma); a transação continua registrando o líquido do creator para o cálculo do saldo.
- `requestWithdrawal`: no modo 'pix', `createPixTransfer` com a API key da plataforma para a chave do creator; no split, mantém a chave do creator.
- Webhook de transferência já atualiza status; só casar também transferências da conta da plataforma.
- Validação do CPF da chave via consulta de chave da Asaas antes de salvar.
