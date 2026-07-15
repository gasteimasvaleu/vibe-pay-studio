## Correções em `ChallengeContributeSheet.tsx`

1. **Remover X duplicado**: `SheetContent` já renderiza um botão de fechar interno. Excluir o `<button>` custom (linhas 135–142) e o import não usado de `X`.
2. **Usar tokens do design system** no lugar de cores fixas (`bg-[#12071e]`, `text-white`, `border-white/10`, `bg-white/[0.04]`, `text-white/60`, `border-orange-*`, `bg-orange-500/15`, `text-orange-300`, `text-emerald-300`, gradiente laranja→rosa):
   - Container do sheet: `bg-background text-foreground border-border`.
   - Cartões/superfícies internas: `bg-card border-border` (ou `bg-muted`).
   - Textos secundários: `text-muted-foreground`.
   - Ícone do troféu: `bg-primary/10 border-primary/30 text-primary`.
   - Faixa selecionada: `border-primary bg-primary/10`; não selecionada: `border-border bg-card hover:bg-accent`.
   - Meta atingida: `text-primary` (removendo verde específico).
   - Botão principal: `Button` padrão (variant default) usando `bg-primary text-primary-foreground`, mantendo `rounded-full h-11 w-full`.
   - `Progress`: usar classe padrão (sem override).

Nada de lógica muda.
