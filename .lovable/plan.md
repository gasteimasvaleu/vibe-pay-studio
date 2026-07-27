## Objetivo

Melhorar contraste do `CallInviteCard` quando exibido em bolha "mine" (fundo roxo). Atualmente todos os textos usam `text-primary` / `text-muted-foreground`, ficando quase invisíveis sobre o gradiente roxo.

## Escopo

`src/routes/_authenticated/chat.$threadId.tsx` — `CallInviteCard` (linhas 89–144).

## Mudança

Aplicar variantes condicionais por `mine`:

- Container: `mine` usa `border-white/40 bg-white/15 backdrop-blur-sm`; `!mine` mantém `border-primary/30 bg-primary/5`.
- Header "VIDEOCHAMADA" + ícone: `mine` → `text-white`; `!mine` → `text-primary`.
- Linha "15 min · R$ ...": `mine` → `text-white font-medium`; `!mine` mantém.
- Estado "Expirado" / "Cancelado": `mine` → `text-white/80`; `!mine` mantém `text-muted-foreground`.
- Estado "Pagamento confirmado": `mine` → `text-emerald-200`; `!mine` mantém `text-emerald-600`.
- Botão "Cancelar convite" (só aparece em `mine`): trocar `variant="outline"` por classes explícitas `border-white/50 bg-white/10 text-white hover:bg-white/20`.

Sem mudanças de lógica ou backend.
