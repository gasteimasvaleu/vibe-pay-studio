## Problema

No paywall de story (`LockedOverlay` em `src/components/feed/StoryViewer.tsx`):

1. As **zonas de toque** (botões absolutos `left-0 w-1/3` e `right-0 w-1/3`, ambos em `z-10`) ficam por cima das laterais do card do paywall no mobile. Clicar em "Carteira" (esquerda) dispara `back()` e clicar em "Cartão" (direita) dispara `advance()` — que no último story fecha o viewer. O `stopPropagation` no `onClick` do wrapper não resolve porque os tap zones são elementos irmãos, não pais.
2. Os cards do `PaymentMethodPicker` usam tokens claros (`bg-secondary`, `border-border`, `text-foreground`) que ficam com baixíssimo contraste sobre o fundo `bg-black/60` do overlay escuro — só o card ativo (roxo) fica visível.

## Correção

**`src/components/feed/StoryViewer.tsx`**
- Elevar o `LockedOverlay` para ficar acima das tap zones: mudar o container externo do overlay para `z-20` (ou envolvê-lo em wrapper `absolute inset-0 z-20`), garantindo que os cliques nas 3 opções de pagamento nunca atinjam os botões `back`/`advance`.
- Alternativa complementar: não renderizar as tap zones enquanto o story estiver bloqueado (`!current.unlocked && !current.is_self` → esconder `back`/`advance`), já que navegar num story pago sem desbloquear não faz sentido. Aplicar as duas mudanças.

**`src/components/payments/PaymentMethodPicker.tsx`** — variante para superfícies escuras
- Adicionar prop opcional `tone?: "light" | "dark"` (default `"light"` — mantém aparência atual em todos os outros usos: SubscribeDialog, TipDialog, PaymentMethodDialog, recarregar).
- Quando `tone="dark"`, aplicar classes com contraste sobre fundo preto:
  - inativo: `border-white/15 bg-white/5 text-white hover:bg-white/10`
  - ativo: `border-primary bg-primary/20 text-white`
  - desabilitado: `border-white/10 bg-white/5 opacity-50`
  - label branco, hint `text-white/70`
- Em `StoryViewer.tsx`, passar `tone="dark"` para o `PaymentMethodPicker` dentro do `LockedOverlay`.

## Fora de escopo

Nenhuma mudança em outras superfícies de pagamento — só o paywall do story.
