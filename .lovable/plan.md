## Problema

Ao clicar em "Salvar" no cadastro bancário, a chamada `POST /accounts` da Asaas retorna 400 com "O email caiorobbb@gmail.com já está em uso.". Isso acontece porque esse e-mail já foi usado para criar uma subconta na Asaas em uma tentativa anterior (ou em outro app do mesmo painel), mas o `asaas_wallet_id` não ficou salvo no `profiles` — então o código tenta criar de novo e a Asaas rejeita.

## Solução

Antes de criar a subconta, tentar **recuperar a subconta existente** por e-mail / CPF-CNPJ e reutilizar `id` + `walletId`. Se a Asaas rejeitar mesmo assim, mostrar mensagem clara ao usuário.

### Mudanças

**`src/lib/asaas.server.ts`**
- Adicionar `findSubaccount({ email?, cpfCnpj? })` que faz `GET /accounts?email=...` (e faz fallback para `cpfCnpj=` se não achar). Retorna a primeira subconta encontrada ou `null`.

**`src/lib/payments.functions.ts` (`saveCreatorPayoutSetup`)**
- Antes do `createSubaccount`, chamar `findSubaccount` com o e-mail do usuário e o CPF/CNPJ do formulário.
  - Se achar: usar `sub.id` e `sub.walletId`, gravar no `profiles`, pular `createSubaccount`.
  - Se não achar: seguir com `createSubaccount` como hoje.
- Envolver `createSubaccount` em try/catch: se a mensagem contiver "já está em uso", tentar `findSubaccount` uma vez mais e, se ainda vier vazio, lançar erro amigável ("Já existe uma conta Asaas com esse e-mail/CPF. Fale com o suporte.").

### Fora de escopo

- Não altera UI, migrations, fluxo de pagamento nem KYC.
- Não implementa mescla de contas duplicadas na Asaas — apenas reutiliza a existente do mesmo dono.