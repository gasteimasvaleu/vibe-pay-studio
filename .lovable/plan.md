## Ajustar cores do dialog "Arquivar postagem"

O dialog de confirmação em `src/components/feed/PublicationOptionsMenu.tsx` (também usado para "Desarquivar") tem o botão "Confirmar" com um gradiente laranja→rosa que não segue o design system do app.

### Mudança

No botão "Confirmar" (linha 337), trocar:

```
bg-gradient-to-r from-orange-400 via-orange-500 to-pink-400 text-white font-semibold shadow-lg shadow-orange-500/30 hover:opacity-95
```

pelo estilo padrão roxo do app usando tokens semânticos:

```
bg-primary text-primary-foreground font-semibold hover:bg-primary/90
```

Nada mais é alterado — o ícone de alerta (âmbar), o botão "Cancelar" (outline) e o texto continuam iguais.