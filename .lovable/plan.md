Redesign visual do componente `Footer` para atender ao novo estilo solicitado.

## O que será feito

1. **Trocar o background do footer** de `bg-black` para `bg-white` (usando `bg-card` para respeitar o tema claro/escuro, já que no tema claro `--card` é branco).
2. **Ajustar as cores do texto interno** para garantir legibilidade sobre fundo branco:
   - Títulos das colunas (`label-caps`) passam de `text-foreground` para um tom escuro sólido (`text-foreground` já é escuro no tema claro, mas vamos garantir contraste).
   - Links e descrição passam de `text-muted-foreground` para um cinza escuro legível (`text-muted-foreground` no tema claro já é `oklch(0.5...)`, que é legível; manteremos, mas vamos trocar o hover para `text-foreground`).
   - Logo mantém o gradiente roxo.
   - Ícones sociais ajustados para cinza escuro com hover no primário.
3. **Envolver o footer em um card flutuante**:
   - Adicionar um wrapper interno com `bg-white`, `rounded-3xl`, `border`, `shadow-card` e margens (`mx-4 mb-6` ou `mx-6 mb-8`) para criar o efeito de card flutuante sobre a página.
   - Manter o `max-w-7xl mx-auto` dentro do card para o conteúdo.
   - Remover o `border-t` do `<footer>` original, pois o card já terá borda arredondada.
4. **Ajustar o container da página** (`SiteLayout`) para garantir que o card flutuante tenha espaço visual: adicionar padding inferior no `<main>` ou margem no footer.
5. **Verificar o tema escuro**: garantir que, no dark mode, o card continue usando `bg-card` (que vira escuro) e as cores de texto continuem legíveis. O efeito flutuante deve se manter.

## Arquivos envolvidos

- `src/components/site/Footer.tsx` — alterações principais de estilo.
- `src/components/site/Layout.tsx` — ajuste de espaçamento inferior se necessário.

## Critérios de aceitação

- Footer renderiza com fundo branco no tema claro.
- Todo o texto interno é legível sobre o fundo branco.
- Footer está visualmente dentro de um card com bordas arredondadas e sombra, criando efeito flutuante.
- Não há regressão no tema escuro.
- Build passa sem erros.