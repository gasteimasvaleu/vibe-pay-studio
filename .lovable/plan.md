## Problema

Asaas retorna **400 invalid_object**: "Para criar esta cobrança é necessário preencher o CPF ou CNPJ do cliente." O cliente Asaas do comprador foi criado sem `cpfCnpj` (em `ensureCustomerId` só enviamos `name`/`email`), e o Asaas exige CPF/CNPJ para gerar qualquer cobrança PIX ou cartão.

Não existe nenhum campo de CPF no perfil hoje.

## Correção

Coletar o CPF do comprador uma única vez e persistir no `profiles`.

### 1. Migration

Adicionar coluna:

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT;
```

Sem alterar RLS/grants (a policy de update do próprio perfil já existe).

### 2. Server (`src/lib/payments.functions.ts` + `src/lib/asaas.server.ts`)

- Em `ensureCustomerId`:
  - Ler também `cpf` do profile.
  - Se `cpf` vazio → `throw new Error("cpf_required")` (código estável que o front detecta).
  - Se já existe `asaas_customer_id` mas o profile agora tem `cpf`, chamar `asaas.updateCustomer(id, { cpfCnpj })` para garantir que o cliente Asaas antigo (criado sem CPF) seja atualizado — controlado por uma flag `asaas_customer_cpf_synced` simples: se `cpf` presente e ainda houver falhas, atualizamos sempre no primeiro uso após save. Implementação: sempre que o front acabou de chamar `saveBuyerCpf`, ele já cuida do update; ver abaixo.
  - Ao criar cliente novo, passar `cpfCnpj: cpf`.
- Nova função em `asaas.server.ts`: `updateCustomer(id, patch)` → `POST /v3/customers/{id}` com JSON.
- Nova server fn `saveBuyerCpf({ cpf })`:
  1. Valida CPF: 11 dígitos numéricos (após strip). Não faz check-digit (Asaas valida). Erros amigáveis em pt-BR.
  2. `update profiles set cpf = ... where user_id = auth.uid()`.
  3. Se `asaas_customer_id` existe, chamar `asaas.updateCustomer(id, { cpfCnpj: cpf })`. Se falhar, retornar sucesso mesmo assim (o próximo `createPayment` pega o cliente atualizado).

### 3. Front (`src/routes/_authenticated/feed.tsx`, `chat.$threadId.tsx`, `publisher.tsx`)

Criar um componente `CpfPromptDialog` (`src/components/payments/CpfPromptDialog.tsx`):
- Input mascarado `000.000.000-00`.
- Botão "Salvar e continuar".
- Chama `saveBuyerCpf` e devolve `onSaved()`.

Em cada tela que chama `createUnlockPayment` / tips / chat unlock / video call (mesmo padrão):
- No catch, se `err.message === "cpf_required"`, abrir o `CpfPromptDialog` mantendo o `pending` selecionado.
- No `onSaved`, re-chamar `confirmPayment` com o mesmo método.

Ordem das telas para editar: feed, publisher, chat, video (mesma função helper compartilhada evita duplicação — criar `src/hooks/useEnsureBuyerCpf.ts` que envelopa a lógica de catch/retry).

### 4. Escopo mínimo

Não altero UI do `PaymentMethodDialog` nem o fluxo padrão — o prompt de CPF só aparece na primeira compra do usuário. Depois disso, `profile.cpf` está salvo e o fluxo segue direto.

## Arquivos alterados

- Migration nova (coluna `profiles.cpf`).
- `src/lib/asaas.server.ts` — nova `updateCustomer`.
- `src/lib/payments.functions.ts` — `ensureCustomerId` lê/exige CPF; nova `saveBuyerCpf`.
- `src/components/payments/CpfPromptDialog.tsx` — novo.
- `src/hooks/useEnsureBuyerCpf.ts` — helper novo.
- `src/routes/_authenticated/feed.tsx`, `publisher.tsx`, `chat.$threadId.tsx` — usar o helper no catch.
