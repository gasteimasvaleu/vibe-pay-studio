# Pagamento no Asaas: modelo do pedido e passo a passo da tela (só consulta, nada muda)

## 1. Pedido de pagamento enviado ao Asaas (`POST /payments`)

```json
{
  "customer": "cus_000012345678",
  "billingType": "PIX",
  "value": 29.90,
  "dueDate": "2026-11-05",
  "description": "Assinatura mensal @creator",
  "externalReference": "<id do pedido no app>",
  "split": [
    { "walletId": "<wallet do creator>", "fixedValue": 24.12 }
  ]
}
```

- `customer`: cliente Asaas do fã. Se ele não tiver um, o app cria um novo (nunca busca pelo CPF).
- `billingType`: `PIX` ou `CREDIT_CARD`. A recarga da carteira aceita só `PIX`.
- `value`: em reais. O app guarda em centavos e converte.
- `dueDate`: 3 dias a partir de hoje, quando não é informado.
- `description`: no máximo 60 caracteres, sem caracteres especiais.
- `externalReference`: liga o pagamento ao pedido do app. O webhook usa esse campo para liberar a compra.
- `split`: só entra quando o creator tem conta Asaas própria (Wallet ID). `fixedValue` = valor líquido do creator (sai a comissão do painel admin e a taxa do Asaas é descontada da parte do creator). No modo "Só PIX", não tem `split` e o valor todo entra na conta da plataforma.

### Cartão novo (acrescenta)
```json
{
  "billingType": "CREDIT_CARD",
  "creditCard": {
    "holderName": "NOME IMPRESSO", "number": "5162306219378829",
    "expiryMonth": "05", "expiryYear": "2028", "ccv": "318"
  },
  "creditCardHolderInfo": {
    "name": "Nome Completo", "email": "fa@email.com", "cpfCnpj": "12345678909",
    "postalCode": "60000000", "addressNumber": "100", "phone": "85999999999"
  },
  "remoteIp": "<IP do fã>"
}
```

### Cartão salvo (no lugar dos dois blocos acima)
```json
{ "billingType": "CREDIT_CARD", "creditCardToken": "<token salvo da própria conta>" }
```

### Pix
Depois de criar o pagamento, o app chama `GET /payments/{id}/pixQrCode`. A resposta traz a imagem do QR Code e o código copia e cola.

## 2. Passo a passo da tela de pagamento

1. **Escolha da forma de pagamento**: aparecem 3 opções:
   - **Saldo da carteira**: mostra "Saldo: R$ X". Se não der, mostra "Saldo insuficiente (R$ X)".
   - **Pix**
   - **Cartão**: lista os cartões salvos ("VISA •••• 1234") e permite adicionar um novo.
2. **CPF**: se o fã ainda não tem CPF cadastrado, uma janela pede o CPF antes de seguir.
3. **Pix**: abre "Pague com PIX" com o QR Code, o código copia e cola e o botão "Copiar código". A tela fica esperando e confirma sozinha quando o Asaas avisa que foi pago.
4. **Cartão novo**: um formulário pede os dados do cartão e do titular. Depois vem a tela de processamento até a resposta.
5. **Erro**: a janela continua aberta, aparece um aviso e o fã pode tentar de novo.
6. **Sucesso**: o conteúdo, a assinatura ou a gorjeta é liberado assim que o pagamento é confirmado.

Nada será alterado no app.
