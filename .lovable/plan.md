Atualizar `src/routes/_authenticated/perfil.$username.tsx` para que a área de identidade (nome, @username, bio, localização, stats e botões sociais) fique com fundo branco, conectada visualmente ao banner roxo de capa, com o avatar sobreposto sobre essa área branca. Ajustar as cores do texto para garantir visibilidade sobre o fundo claro.

### Alterações

1. **Fundo branco na área de identidade**:
   - Aplicar `bg-card` (ou `bg-white` caso o design system não tenha token adequado) na `<div>` de identidade (linha 151).
   - Adicionar `rounded-3xl rounded-t-none` para o card branco se conectar ao banner arredondado sem borda superior visível.
   - Adicionar `shadow-card` para separar do fundo escuro da página.

2. **Conectar ao banner roxo e acomodar o avatar**:
   - Remover `pt-10 sm:pt-12` e adicionar `mt-[-48px] sm:mt-[-56px] pt-16 sm:pt-20` para puxar o card branco para cima, ficando colado ao banner, e deixar espaço para o avatar que fica sobreposto.

3. **Corrigir cores do texto para visibilidade**:
   - Nome (`h2`): `text-foreground` (ou `text-black`/`text-gray-900` se necessário).
   - @username (`p`): `text-muted-foreground`.
   - Localização e stats mobile: `text-muted-foreground`.
   - Ajustar botões sociais e stats para terem contraste sobre o fundo claro.

4. **Ajustar botões e stats**:
   - Stats flutuantes (desktop) no banner: manter se já tiverem contraste; caso fiquem invisíveis sobre o fundo branco, movê-los para dentro do card branco.
   - Botões sociais: trocar fundo translúcido por `bg-secondary` ou `bg-muted` com `text-secondary-foreground`.
   - CTA "Editar perfil" / "Assinar": ajustar bordas/fundo para o tema claro local.

5. **Manter responsividade**:
   - Garantir que o card branco não quebre em telas pequenas.
   - Manter o avatar centralizado/sobreposto corretamente.

### Fora de escopo

- Não alterar funcionalidades de dados (mock stats, posts, etc.).
- Não mudar rotas, onboarding ou Veriff.
- Não alterar a página de feed.

Após aprovado, aplico a mudança e verifico no preview em desktop.