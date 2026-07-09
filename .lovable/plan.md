Atualizar `src/routes/_authenticated/perfil.$username.tsx` para adicionar uma borda roxa sutil na área de identidade branca e deslocar levemente o nome, @username, bio, localização e botões de rede social para a direita.

### Alterações

1. **Adicionar borda roxa sutil** no card branco de identidade (linha 151):
   - Incluir `border border-primary/30` para criar uma borda fina na cor primária roxa, sutil como a do banner.

2. **Deslocar conteúdo para a direita**:
   - Adicionar `pl-4 md:pl-6` no card de identidade, empurrando suavemente para a direita todo o conteúdo interno (nome, @username, bio, localização, stats mobile e botões sociais).

3. **Manter** a conexão com o banner roxo, a sobreposição do avatar, o fundo branco e as cores de texto já ajustadas.

### Fora de escopo

- Não alterar o banner, avatar, CTA ou abas.
- Não mexer em dados/mock.
- Não alterar feed, onboarding ou Veriff.

Após aprovado, aplico a mudança e verifico no preview.