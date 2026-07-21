Problema
O header da rota `/publicacoes-agendadas` está com `bg-card` e sem `sticky`/`backdrop-blur`, diferente do padrão adotado nas outras páginas do app (`/banco`, `/follow`, `/mywallet`, `/my-monetisex-stats`), que usam `sticky top-0 bg-background/90 backdrop-blur`.

Alteração proposta
Em `src/routes/_authenticated/publicacoes-agendadas.tsx`:
1. Substituir `header className="relative z-10 border-b border-border bg-card"` por `header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur"`.
2. Manter o conteúdo interno do header (botão voltar, título, spacer) inalterado.
3. Verificar visualmente no preview que o header fica translúcido e acompanha o scroll como nas páginas irmãs.

Escopo
Apenas ajuste de estilo do header; nenhuma mudança de funcionalidade ou dados.