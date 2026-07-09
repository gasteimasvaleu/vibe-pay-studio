Mover o botão "Editar perfil" do bloco de CTA separado para dentro do card branco de identidade, posicionando-o logo abaixo dos botões de rede social. Aplicar a ele a mesma borda roxa sutil (`border-primary/30`) usada no card branco, e garantir que o texto/fundo fiquem visíveis sobre o fundo claro.

### Alterações

1. **Mover botão "Editar perfil"** em `src/routes/_authenticated/perfil.$username.tsx`:
   - Remover o botão "Editar perfil" do bloco CTA atual (linhas 180–183).
   - Inserir o botão dentro da `<div>` de identidade (card branco), após os botões de rede social.

2. **Estilizar o botão para o card branco**:
   - Aplicar `border border-primary/30` (igual à borda do card branco).
   - Fundo `bg-secondary` e texto `text-secondary-foreground` para visibilidade sobre o fundo claro.
   - Manter `rounded-full`, `w-full`, `h-11` e efeito hover `hover:bg-muted`.

3. **Limpar o bloco CTA externo**:
   - Deixar o bloco CTA abaixo do card apenas com o botão "Assinar por..." (caso não seja o dono do perfil).

### Fora de escopo

- Não alterar o botão "Assinar por...".
- Não mexer no banner, avatar, abas ou feed.

Após aprovado, aplico a mudança e verifico no preview.