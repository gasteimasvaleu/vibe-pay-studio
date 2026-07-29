## Situação atual

Quando o usuário escolhe **Cartão** e **não tem cartão salvo**, o fluxo atual chama o Asaas, recebe um `invoiceUrl` e o `CardCheckout` abre esse link **numa nova aba** (`window.open`). O usuário sai do contexto — ruim em telas ao vivo (Story em contagem regressiva, Live acontecendo, carrossel, chat).

Já temos toda a infra pronta para resolver isso inline:
- Formulário de tokenização completo em `mywallet.index.tsx` (número, validade, CVV, CPF, CEP, número, telefone).
- Server fn `tokenizeAndSaveCard` que devolve o `savedCardId`.
- Todas as `create*Payment` já aceitam `savedCardId` e retornam `paidImmediately: true` quando o Asaas confirma síncrono (cobrança 1-click).

## Proposta

Trocar a "nova aba para o Asaas" por um **checkout inline em dialog** que faz tokenização + cobrança 1-click no mesmo modal. O usuário nunca sai da página (Story, Live, feed, perfil, chat, assinatura, tip).

### Fluxo unificado no dialog de pagamento

```text
[PaymentMethodPicker]
   ├── Carteira / PIX  →  fluxo atual (PixCheckout / débito wallet)
   └── Cartão
         ├── Tem cartão salvo? → seleciona 1-click e confirma (já funciona)
         └── Sem cartão / "Usar novo cartão"
               → abre <NewCardCheckoutStep> DENTRO do mesmo dialog
                    1. Formulário compacto do cartão (mesmo do /mywallet)
                    2. Checkbox "Salvar cartão para próximas compras" (default: on)
                    3. Botão "Pagar R$ X,XX"
                    4. tokenizeAndSaveCard → savedCardId
                    5. createXPayment({ savedCardId, ...})
                    6. Se paidImmediately: fecha com sucesso
                       Senão: mostra "Aguardando confirmação" (polling)
                    7. Se o usuário desmarcou "Salvar": deletar
                       o cartão via deleteSavedCard após a cobrança
```

O redirect antigo para o `invoiceUrl` do Asaas fica só como **fallback** (link "Abrir checkout no Asaas") caso a tokenização falhe — nunca abre sozinho.

### Componentes

1. **Novo** `src/components/payments/NewCardCheckoutStep.tsx`
   - Extrai o formulário de cartão hoje inline em `mywallet.index.tsx` para um componente reutilizável.
   - Props: `amountCents`, `onSuccess(savedCardId, keepCard)`, `onCancel`, `tone?: "light" | "dark"`.
   - Faz apenas a **tokenização**; a cobrança fica com quem chamou (para permitir a variação por produto: story, live, tip, etc.).

2. **Novo** `src/components/payments/InlineCardCheckoutDialog.tsx`
   - Dialog auto-contido que recebe uma `charge()` callback e o `amountCents`.
   - Encapsula: NewCardCheckoutStep → chamar `charge(savedCardId)` → mostrar "Pagamento aprovado" ou polling.
   - Suporta `tone="dark"` para Story/Live (fundo escuro dos overlays).

3. **Refatorar** `PaymentMethodPicker`
   - Já mostra "Usar novo cartão" quando há cartão salvo. Adicionar `onRequestNewCard()` para o consumidor abrir o InlineCardCheckoutDialog.
   - Quando não há nenhum salvo e o usuário clica em Cartão → sinaliza automaticamente `onRequestNewCard()`.

4. **Atualizar chamadores**
   - `StoryViewer.tsx` (story unlock)
   - `LiveTicketDialog.tsx` (ticket de live)
   - `TipDialog.tsx` (gorjeta)
   - `SubscribeDialog.tsx` (assinatura)
   - `PostUnlockDialog` / feed unlock
   - Chat: paid DM, videochamada, mídia paga (`ChatComposer` fluxos que abrem `PaymentModal`)
   - `mywallet.recarregar.tsx` (recarga)
   - Substituem o `PaymentModal` legado (nova aba) por `InlineCardCheckoutDialog` no ramo CREDIT_CARD sem token. Fluxos PIX/Wallet continuam iguais.

5. **`CardCheckout` antigo** vira legacy usado só se `invoiceUrl` for retornado sem `savedCardId` (defensivo). Sem `window.open` automático — só link manual.

### Detalhes de UX

- Modal responsivo (`max-w-md`), scroll interno quando o teclado mobile aparece.
- Em Story/Live: pausar a mídia enquanto o dialog está aberto (Story já faz isso ao abrir dialog; Live pode manter o player rodando).
- Botão primário: **"Pagar R$ X,XX"**; secundário: **"Cancelar"**.
- Feedback:
  - Loading no botão durante `tokenizeAndSaveCard` → "Validando cartão…"
  - Loading durante `createXPayment` → "Processando pagamento…"
  - Sucesso: check + auto-close em ~800ms disparando o `onPaid` do chamador (desbloqueio imediato do story/live/etc).
  - Erro Asaas: toast + mantém o modal aberto para o usuário corrigir.
- Checkbox "Salvar cartão para próximas compras" default ligado. Se desligado, chamamos `deleteSavedCard` após a cobrança concluir.

### Segurança

- Nenhum dado sensível de cartão passa por logs. A tokenização já é server-side via Asaas.
- Formulário nunca envia PAN para nossos endpoints exceto o próprio `tokenizeAndSaveCard`.

### Fora de escopo

- Mudanças no fluxo PIX/Carteira.
- 3-D Secure custom (Asaas cuida internamente do token quando exigido; nesse caso o `paidImmediately` vem false e caímos no polling).
- Reorganização visual do `PaymentMethodPicker` além da nova ação "Usar novo cartão".