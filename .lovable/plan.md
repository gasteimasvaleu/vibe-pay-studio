Ajustar o componente `src/components/site/BottomNav.tsx` para que o item "Busca", renderizado apenas no modo assinante (`isSubscriber`), se comporte como um link para `/search`.

### Alteração técnica
- No `NavItem` condicional para assinantes (linhas 67-71), adicionar:
  - `to="/search"`
  - `active={pathname.startsWith("/search")}`

Isso converte o `<button>` atual em `<Link>` da TanStack Router, mantendo o mesmo ícone e label, mas permitindo navegação para a página de busca.

### Arquivos envolvidos
- `src/components/site/BottomNav.tsx`