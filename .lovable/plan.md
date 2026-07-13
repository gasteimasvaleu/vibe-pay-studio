## Correção da barra de ações invisível

A barra foi adicionada, mas os ícones estão em `text-white/90` sobre um card semitransparente numa página de fundo claro — resultado: invisíveis.

### Edição em `src/components/feed/PublicationCard.tsx`

Na barra de ações (curtir / comentar / salvar):

1. Trocar `text-white/90` por `text-foreground/80` e `hover:text-foreground`.
2. Trocar `hover:bg-white/10` por `hover:bg-foreground/10`.
3. Estado salvo: `fill-foreground text-foreground` (curtir permanece `fill-red-500 text-red-500`).
4. Adicionar `border-t border-border/40 mt-1` no container das ações e ajustar padding para `px-3 py-1.5` para dar separação visual da mídia.

Nada mais é alterado.
