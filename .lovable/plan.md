# Cartão salvo na Carteira — Recarga com 1-clique

Hoje o botão "Adicionar novo cartão" em `/mywallet` só mostra um toast e some. Vamos torná-lo funcional: o cartão adicionado fica salvo (tokenizado no Asaas), aparece na grade "Meus Cartões" e pode ser usado para recarregar a carteira sem redigitar dados.

## O que muda para o usuário

- Ao adicionar um cartão, ele é tokenizado no Asaas (nenhum PAN salvo no nosso banco — só a bandeira, últimos 4 dígitos, validade e o token do Asaas).
- A grade "Meus Cartões" passa a listar os cartões salvos, com opção de remover.
- Na tela `/mywallet/recarregar`, quando o método for Cartão, aparece a opção "Usar cartão salvo" listando os cartões já tokenizados — 1 clique para confirmar a recarga.

## Backend

**Nova tabela** `saved_cards` (migration):
- `id uuid pk`, `user_id uuid` (fk auth.users, RLS por auth.uid()), `asaas_customer_id text`, `asaas_card_token text`, `brand text`, `last4 text`, `holder_name text`, `exp_month text`, `exp_year text`, `created_at`, `updated_at`.
- RLS: dono lê/insere/deleta os próprios; sem acesso anon. GRANT SELECT/INSERT/DELETE ao `authenticated`; ALL ao `service_role`.

**Novas server functions** em `src/lib/payments.functions.ts` (ou novo `src/lib/saved-cards.functions.ts`), todas com `requireSupabaseAuth`:
- `listSavedCards()` → retorna cartões do usuário (sem token).
- `tokenizeAndSaveCard({ number, holderName, expMonth, expYear, ccv, cpf, postalCode, addressNumber, phone })` → cria/reusa `asaas_customer_id` do usuário, faz uma cobrança R$0 tokenizada OU usa endpoint `/creditCard/tokenize` do Asaas (o cliente já tem `createPayment` com `creditCard`, então reaproveitamos o fluxo: fazemos um `authorizationOnly` de valor mínimo já existente, ou preferimos o endpoint dedicado de tokenização do Asaas). Persiste apenas token + metadados públicos.
- `deleteSavedCard({ id })` → apaga a linha (o token no Asaas fica inerte).

**Extensão em `createPayment`** (`src/lib/asaas.server.ts`): já aceita `creditCardToken` — não muda.

**Nova server fn** `chargeSavedCardTopUp({ savedCardId, amountCents })` para recarregar a carteira via cartão salvo, reusando o mesmo caminho de recarga existente com `creditCardToken`.

## Frontend

**`src/routes/_authenticated/mywallet.index.tsx`**:
- Substituir o `toast` do `handleConfirm` por chamada real a `tokenizeAndSaveCard` (`useServerFn` + `useMutation`), invalidando `["saved-cards"]` e fechando o diálogo em sucesso, com toast de erro em falha.
- Renderizar a grade a partir de `useQuery(["saved-cards"], listSavedCards)`: cada cartão vira um card mostrando bandeira, `**** last4`, validade, com botão de remover (confirmação).
- Botão "Adicionar novo cartão" continua abrindo o mesmo diálogo já existente.

**`src/routes/_authenticated/mywallet.recarregar.tsx`** (ajuste mínimo):
- Quando o método de pagamento for Cartão, mostrar seletor "Cartão salvo" com a lista; se o usuário escolher um, chamar `chargeSavedCardTopUp` em vez do fluxo de digitar cartão. Manter "Usar novo cartão" como opção.

## Segurança / Compliance

- Nenhum dado sensível (PAN, CVV) é gravado no nosso banco — só o token do Asaas e metadados públicos.
- Tokenização e cobrança sempre server-side, com `requireSupabaseAuth`.
- RLS restrita ao dono; nada de acesso anônimo.

## Fora de escopo

- Cobrança recorrente automática de assinaturas com o cartão salvo.
- Pagar publicações/chats/mimos direto no cartão (continua via carteira).
