Ajustar os cards de postagens na página de perfil para usar as cores do app e a borda padrão, garantindo visibilidade sobre o fundo branco.

### Alterações

- No arquivo `src/routes/_authenticated/perfil.$username.tsx`, no componente `ProfilePostCard`:
  - Substituir o fundo `bg-white/5` por `bg-card`.
  - Substituir a borda `border-white/10` por `border` (borda padrão `--color-border`) do app.
  - Tornar todos os textos do card legíveis no fundo claro:
    - Nome: `text-foreground` (ou manter herdado).
    - @username e tempo: `text-muted-foreground`.
    - Ícones de ação (`IconAction`): `text-muted-foreground` e `hover:text-foreground hover:bg-muted`.
    - Estado ativo/curtido: `text-primary`.
    - Badge de verificado: manter `text-fuchsia-400` ou adaptar com `text-primary` se preferir.
    - Avatar genérico: trocar texto branco sobre gradiente para garantir contraste.
    - Contadores de mídia/curtidas na overlay bloqueada: `text-foreground` em vez de `text-white/80`.
  - Manter layout, bordas arredondadas, backdrop-blur, animações e estado local.

### Fora do escopo

- Não criar novas rotas.
- Não alterar outros componentes da página além do `ProfilePostCard`.
- Não modificar o tema global.

### Resultado esperado

Os cards da aba "Postagens" terão a aparência padrão do app, com borda consistente e texto legível sobre o fundo branco.