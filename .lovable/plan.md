Alterar o fundo da página `/my-monetisex-stats` para branco (#FFFFFF).

Em `src/routes/_authenticated/my-monetisex-stats.tsx` (linhas 59-64):
- Trocar `bg-background` no overlay para `bg-white`
- Remover a camada `gradient-radial` (que colore o fundo com o roxo)

Resultado: o `<main>` fica sobre fundo branco sólido, consistente com o header já branco.
