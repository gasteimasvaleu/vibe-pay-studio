Ajustar o botão "Editar perfil" dentro do card branco de identidade em `src/routes/_authenticated/perfil.$username.tsx` mantendo a largura total, diminuindo a altura e o arredondamento, e centralizando-o horizontalmente dentro do card.

### Alterações

1. **Diminuir altura** (linha 178):
   - Trocar `h-11` por `h-9`.

2. **Diminuir border-radius**:
   - Trocar `rounded-full` por `rounded-xl`.

3. **Centralizar o botão no card sem perder o deslocamento do nome/bio**:
   - Manter `pl-4 md:pl-6` no card branco para o nome, @username, bio e botões sociais continuarem levemente deslocados para a direita.
   - Envolver o botão "Editar perfil" em uma `<div>` com `pr-4 md:pr-6` para que o botão `w-full` fique com o mesmo espaço à esquerda e à direita, aparecendo centralizado dentro do card.

4. **Manter estilo visual**:
   - Preservar `border border-primary/30`, `bg-secondary`, `text-secondary-foreground`, `hover:bg-muted` e `transition-colors`.

### Fora de escopo

- Não alterar outras seções do perfil.
- Não mexer no feed, onboarding ou Veriff.

Após aprovado, aplico a mudança e verifico no preview.