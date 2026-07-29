## Problema

O Asaas está rejeitando a tokenização com `invalid_holderInfo`:
- "Informe o número de contato com DDD do titular do cartão."
- "O CEP informado é inválido."

Causa confirmada em `src/routes/_authenticated/mywallet.index.tsx` (linhas 144-154): o formulário envia `postalCode: "00000000"`, `addressNumber: "0"` e não envia `phone`. O Asaas endureceu a validação de `creditCardHolderInfo` e agora exige CEP válido e telefone com DDD.

## Solução

Adicionar campos reais ao diálogo "Adicionar cartão" e propagar até o `tokenizeAndSaveCard` (que já aceita esses campos em `src/lib/saved-cards.functions.ts`).

### Mudanças

**`src/routes/_authenticated/mywallet.index.tsx`**
- Novos estados: `postalCode`, `addressNumber`, `phone`.
- Máscaras: CEP `00000-000` (8 dígitos), telefone `(00) 00000-0000` (10–11 dígitos).
- Novos inputs no diálogo (mesmo estilo dos existentes), na ordem: CEP + Nº (linha dividida) e Telefone (linha inteira), abaixo do CPF.
- Validação client-side: CEP com 8 dígitos, telefone com 10 ou 11 dígitos, número do endereço não vazio.
- Enviar `postalCode`, `addressNumber` e `phone` (só dígitos) para `tokenize({ data: ... })`.
- Resetar os novos campos em `resetCardForm()`.

**Pré-preencher quando possível (opcional, mesmo turno)**
- Nenhuma mudança de backend necessária: `tokenizeAndSaveCard` já aceita `postalCode`, `addressNumber` e `phone` e os repassa ao Asaas via `createCustomer`/`tokenizeCreditCard`.

## Detalhes técnicos

- Escopo estritamente frontend, na rota `/mywallet`. Sem migrações, sem alteração de server function, sem mudança em outros checkouts.
- Estilo dos inputs segue o padrão já usado no diálogo (mesmas classes de `<Input placeholder="…" />`).
- Mensagens de erro amigáveis via `toast.error` na validação local.
