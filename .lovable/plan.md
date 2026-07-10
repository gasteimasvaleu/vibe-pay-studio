Vou corrigir o botão selecionado de forma direta:

1. Ajustar o `ActionCard` para que, quando receber `to`, use navegação programática do TanStack Router em um `<button>` real, em vez de depender do `<Link>` renderizado como anchor. Isso mantém o mesmo visual do dashboard e evita o caso em que o clique no card não dispara a navegação na prévia.
2. Manter o destino atual do card "Assinaturas" como `/subscriptions`.
3. Verificar rapidamente que clicar no card muda a URL para `/subscriptions` e abre a página criada.

Detalhes técnicos:
- Alteração principal em `src/components/dashboard/ActionCard.tsx`.
- Se necessário, ajustar o tipo de `to` para aceitar strings de rota sem quebrar os cards existentes.