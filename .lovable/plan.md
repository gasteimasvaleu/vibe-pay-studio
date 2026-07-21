## Objetivo

Impedir que qualquer termo sensível (ex.: "sexando", "sexy", nome de plano criado pelo usuário, apelido do criador) apareça na tela do PIX / fatura do cartão / extrato bancário do pagador.

Hoje enviamos ao Asaas descrições como `Assinatura ${data.plan}` e `Desbloqueio publicação ...`, onde `data.plan` é texto livre digitado pelo criador. Alguns bancos exibem esse `description` na tela do PIX junto ao nome do recebedor — daí sai o "sexando".

## Mudanças

### 1. `src/lib/asaas.server.ts` — sanitizador central
- Criar helper `sanitizeAsaasText(text: string)` aplicado dentro de `createPayment` **antes** de enviar `description`:
  - remove acentos, normaliza espaços;
  - filtra por regex uma lista de termos proibidos (`sex`, `sexo`, `sexy`, `sexando`, `porn`, `nude`, `xxx`, `hot`, `fetiche`, `putaria`, etc.);
  - trunca em 60 caracteres (limite visível na maioria dos apps de banco).
- Mesma sanitização aplicada em `holderName` / `customer.name` quando enviados (nome do pagador não afeta a tela do recebedor, mas é bom garantir).

### 2. `src/lib/payments.functions.ts` — descrições neutras
Substituir todas as descrições por textos genéricos que **não** interpolam conteúdo do criador:

| Fluxo atual | Novo `description` |
|---|---|
| `Assinatura ${data.plan}` | `Assinatura MTX` |
| `Desbloqueio publicação ...` | `Compra MTX` |
| `Desbloqueio story ...` | `Compra MTX` |
| `Desbloqueio mensagem` | `Compra MTX` |
| `Contribuição desafio ...` | `Compra MTX` |
| `Tip para criador` | `Compra MTX` |
| `Videochamada Xmin` | `Compra MTX` |
| `Recarga carteira` | `Recarga MTX` |

O detalhamento real (nome do plano, publicação, criador) continua no nosso banco (`payments`, `wallet_transactions`) e aparece normalmente em `/mywallet/extrato` — só não vai mais no payload do Asaas.

### 3. Nome do recebedor (subconta)
O nome que aparece como "quem vai receber" no app do banco vem do `name` da subconta Asaas do criador (`createSubaccount`). Hoje usamos o nome civil do criador (KYC). **Não vamos alterar** — é obrigatório por regulação do Asaas usar o nome real do titular da conta. Se o "sexando" estiver vindo daí, é o nome civil real do criador e não deve ser mascarado.

### 4. Verificação
Após a mudança, testar um pagamento PIX real de assinatura para confirmar que a tela do banco mostra apenas `Assinatura MTX` (ou similar) e o nome civil do criador.

## Fora de escopo
- Não alterar o texto `"Saque Monetisexy"` das transferências (assunto tratado em conversa anterior).
- Não mexer em nomes de planos armazenados em `subscription_plans` — continuam livres para o criador editar; só não vão mais no payload externo.