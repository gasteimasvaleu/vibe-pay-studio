## Mover acesso do Creator Hub para a BottomNav

### Mudanças

**1. `src/components/site/BottomNav.tsx`**
- No layout de creator (não-subscriber), substituir o botão "Minha carteira" (ícone `Wallet`) por um link "Fadinha" apontando para `/creator-hub`.
- Usar um ícone adequado (`Sparkles` do lucide-react, mesmo já usado no TopNav para o hub), com estado ativo quando `pathname.startsWith("/creator-hub")`.
- Manter o layout de subscriber inalterado (continua mostrando "Busca").

**2. `src/components/site/TopNav.tsx`**
- Remover o ícone Sparkles / link para `/creator-hub` da barra superior (agora vive na inferior).
- Remover imports/estado que ficarem sem uso (`Sparkles`, `isCreator`, `isCreatorLike`, consulta a `account_type`/`creator_profiles` que existia apenas para decidir esse ícone — preservar o que ainda alimenta o avatar).

### Fora de escopo
- Nenhuma mudança em `/mywallet` em si — a rota continua acessível pelo Dashboard e links existentes.
- Sem mudanças de estilo/altura da BottomNav.
