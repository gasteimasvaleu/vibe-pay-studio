## Plano: Alterar cor do botão de plano para roxo padrão

### O que será feito
No arquivo `src/routes/_authenticated/perfil.$username.tsx`, o componente `PlanPill` (pílula de assinatura que exibe "1 mês R$ 29,00") usa um gradiente laranja (`from-orange-400 via-orange-300 to-orange-200`). Vamos trocar para o roxo padrão do app usando os tokens semânticos existentes.

### Mudança técnica
- Substituir as classes de gradiente laranja do `PlanPill` por `bg-gradient-primary` (já definido em `src/styles.css` e mapeado como utilitário) ou, alternativamente, por `bg-gradient-to-r from-primary to-primary/80`, mantendo `text-primary-foreground` para garantir contraste.
- Preservar o comportamento de clique e o layout atual (largura total, altura, arredondamento, sombra).

### Arquivos alterados
- `src/routes/_authenticated/perfil.$username.tsx` — apenas o `className` do `button` dentro de `PlanPill`.

### Validação
- Acessar `/perfil/<username>` como outro usuário/assinante e confirmar que a pílula "1 mês" aparece na cor roxa padrão do app, com texto legível.
