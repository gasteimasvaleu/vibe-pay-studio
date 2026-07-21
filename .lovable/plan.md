## Objetivo
No dashboard do creator pago, quando o perfil gratuito já existir (`freeProfileEnabled = true`), o card "Perfil Gratuito" deve aparecer apagado (desabilitado) e comunicar que o perfil já existe.

## Mudanças

**1. `src/components/dashboard/ActionCard.tsx`**
- Quando `disabled` for `true`, remover comportamento de navegação (ignorar `to`) e o hover, além de aplicar `cursor-not-allowed`. Hoje o `disabled` só reduz opacidade, mas o clique via `to` continua navegando porque o `onClick` chama `navigate` antes de qualquer checagem de `disabled` (o botão HTML respeita `disabled`, então o clique é bloqueado — ok — mas garantimos o cursor e semântica).

**2. `src/components/dashboard/CreatorDashboard.tsx`**
- No card "Perfil Gratuito" (visível apenas quando `variant === "creator"`):
  - Se `freeProfileEnabled === true`: renderizar `ActionCard` com `disabled`, sem `to`, com título "Perfil Gratuito" e descrição "Você já tem um perfil gratuito ativo".
  - Caso contrário: manter o comportamento atual (`to="/criar-perfil-gratuito"`).

## Observações
- A troca entre perfis continua acontecendo via `switchBar` no topo do dashboard — o card apagado é apenas informativo.
- Nenhuma mudança de backend/SQL.
