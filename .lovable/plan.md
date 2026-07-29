## Diagnóstico (confirmado no banco)

As duas contas usadas nos testes têm o **mesmo CPF** (`005.685.551-63`), mas foram criadas como **clientes diferentes no Asaas**:

| Conta | Cliente Asaas | Cartões salvos |
|---|---|---|
| caiorobbb@gmail.com | `cus_000187878153` | VISA •7159 |
| sexandoapp7@hotmail.com | `cus_000188942724` | nenhum |

O Asaas recusa tokenizar o mesmo cartão físico novamente para o mesmo CPF, mesmo que o cliente seja outro. Por isso a correção anterior (buscar cartão salvo do próprio usuário) não resolveu: a conta `sexandoapp7` não tem nenhum cartão salvo — ela cai direto na chamada de tokenização e recebe o erro.

## O que será feito

Decisão aprovada: contas com o mesmo CPF passam a **compartilhar o cliente Asaas**.

1. **Buscar cliente por CPF antes de criar**
   Nova função `findCustomerByCpf` em `src/lib/asaas.server.ts` (consulta `/v3/customers?cpfCnpj=...`, mesmo padrão de `findSubaccount`).
   `ensureCustomerId` (existe duplicada em `src/lib/payments.functions.ts` e `src/lib/saved-cards.functions.ts`) passa a: usar o `asaas_customer_id` do perfil → senão procurar por CPF no Asaas e gravar o id encontrado no perfil → só criar novo cliente se não existir nenhum.

2. **Consolidar os clientes duplicados já existentes**
   Migração que aponta os perfis com CPF repetido para o cliente Asaas mais antigo daquele CPF (no caso, `cus_000187878153`), evitando que o problema continue nas contas atuais.

3. **Reaproveitar cartão já tokenizado do mesmo CPF**
   Em `tokenizeAndSaveCard`, antes de chamar o Asaas, procurar um cartão ativo com o mesmo `asaas_customer_id` + `last4` + validade. Se existir (mesmo pertencendo a outra conta com o mesmo CPF), criar uma linha em `saved_cards` para o usuário atual reutilizando o `asaas_card_token`, sem chamar a tokenização. O checkout inline segue direto para a cobrança.

4. **Mensagem de erro final**
   Se ainda assim o Asaas responder “já tokenizado”, o toast passa a orientar: “Este cartão já está cadastrado em outra conta com o mesmo CPF — selecione-o na lista de cartões salvos.”

## Detalhes técnicos

- Arquivos: `src/lib/asaas.server.ts`, `src/lib/saved-cards.functions.ts`, `src/lib/payments.functions.ts`, `src/lib/payment-limits.ts` + uma migração de consolidação.
- Sem mudança de UI; o fluxo do `NewCardCheckoutStep` continua igual (tokenizando → cobrando → confirmado), apenas a etapa de tokenização pode ser pulada quando o token já existe.
- Cobranças continuam registradas em `payment_intents` com o `user_id` de quem pagou; apenas o cliente do gateway é compartilhado.

## Validação

Após aplicar: fazer um pagamento com `sexandoapp7@hotmail.com` usando o cartão •7159 — deve reaproveitar o token, cobrar e desbloquear sem erro.
