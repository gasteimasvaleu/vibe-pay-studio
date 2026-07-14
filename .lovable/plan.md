## Objetivo
Impedir que checkouts caiam no erro `amount_too_low_for_fees` do Asaas expondo mínimos por método já na UI, e — quando ainda assim escaparem — mostrar uma mensagem clara em português no lugar da string técnica.

## Escopo
Métodos em uso hoje: **PIX** e **CREDIT_CARD à vista**. Boleto e débito não estão ativos no checkout (não há UI que os selecione), então ficam de fora — se forem ativados no futuro, o mesmo helper cobre.

## Mínimos por método
Cálculo do menor bruto em que o líquido do creator (`bruto − 15% − taxa Asaas`) ainda é positivo, arredondado para valores "de UI" que deixem uma sobra razoável ao creator:

| Método       | Taxa Asaas         | Mínimo técnico | Mínimo aplicado na UI |
|--------------|--------------------|----------------|-----------------------|
| PIX          | R$ 1,99            | ~R$ 2,35       | **R$ 3,00**           |
| CREDIT_CARD  | 2,99% + R$ 0,49    | ~R$ 0,60       | **R$ 2,00**           |

Os valores ficam em uma única fonte de verdade em `src/lib/asaas.server.ts` para casar server e UI.

## Mudanças

### 1. `src/lib/asaas.server.ts`
- Exportar `MIN_GROSS_CENTS_BY_METHOD: Record<AsaasBillingMethod, number>` com os valores acima.
- Exportar `getMinGrossCents(method)` e `assertMeetsMinimum(grossCents, method)` que lança um erro tipado `amount_below_minimum:<method>:<minCents>`.
- Em `computeCreatorNetCents`, chamar `assertMeetsMinimum` antes do cálculo — passa a lançar `amount_below_minimum` em vez de `amount_too_low_for_fees` quando o input é muito baixo.

### 2. `src/lib/payments.functions.ts` (client-safe wrapper)
- Exportar uma constante espelho `PAYMENT_MIN_GROSS_CENTS` (objeto literal com os mesmos valores) para uso na UI sem importar código server.
- Exportar um helper puro `getPaymentMethodMinimum(method)` na mesma constante para reuso.

Observação: os checkouts server já chamam `computeCreatorNetCents`, então herdam automaticamente a nova validação.

### 3. UI de checkout
Aplicar a mesma pattern em cada componente/rota que abre um pagamento:

- `src/components/payments/TipDialog.tsx` — validar o input de valor da gorjeta contra o mínimo do método selecionado; desabilitar o botão "Enviar" quando abaixo; mostrar helper text (`"Mínimo para PIX: R$ 3,00"`).
- `src/routes/_authenticated/mywallet.recarregar.tsx` — mesmo tratamento no valor de recarga.
- `src/components/payments/SubscribeDialog.tsx`, `src/routes/_authenticated/feed.tsx` (unlock), `src/routes/_authenticated/chat.$threadId.tsx` (chat unlock), `src/routes/_authenticated/perfil.$username.tsx` (video call/unlock) — o valor vem do preço da publicação/assinatura, então:
  - Se `price_cents < mínimo do método`, desabilitar o botão desse método no seletor e mostrar tooltip `"Indisponível para este valor (mínimo R$ X,XX no PIX)"`.
  - Se todos os métodos forem inválidos (raro), mostrar aviso "Valor abaixo do mínimo aceito pelo meio de pagamento".

### 4. Tradução de erro no toast
Em um util compartilhado (novo `src/lib/payment-errors.ts`) mapear:
- `amount_below_minimum:PIX:300` → `"Mínimo para PIX é R$ 3,00."`
- `amount_below_minimum:CREDIT_CARD:200` → `"Mínimo para cartão é R$ 2,00."`
- `amount_too_low_for_fees` (fallback legado) → `"Valor muito baixo para cobrir as taxas do meio de pagamento."`

Cada callsite que hoje faz `toast.error(err.message)` passa a usar `toast.error(translatePaymentError(err))`.

## Fora de escopo
- Boleto / débito / crédito parcelado (não estão em uso).
- Ajuste de preços mínimos de publicação/assinatura no cadastro do creator (pode virar tarefa separada; hoje só bloqueia o checkout).
- Preços promocionais Asaas (continuam ignorados, conforme decisão anterior).

## Como testar
1. Tentar gorjeta de R$ 2,00 via PIX → botão desabilitado + helper "Mínimo R$ 3,00".
2. Tentar recarga de R$ 1,00 via PIX → mesmo bloqueio.
3. Publicação com `price_cents = 250` (R$ 2,50) → PIX aparece desabilitado, cartão habilitado.
4. Forçar chamada direta ao server fn com valor abaixo do mínimo → server responde `amount_below_minimum:...` e a UI mostra o toast traduzido.