## Ajuste global: dialogs não devem colar nas bordas no mobile

Alterar as classes base de `DialogContent` e `AlertDialogContent` para adicionar margem lateral no mobile e arredondamento consistente em qualquer viewport.

### Arquivos

**`src/components/ui/dialog.tsx`** (linha 41)
Trocar `w-full max-w-lg ... sm:rounded-lg` por:
```
w-[calc(100%-2rem)] max-w-lg rounded-lg
```

**`src/components/ui/alert-dialog.tsx`** (linha 37)
Mesma troca: `w-[calc(100%-2rem)] max-w-lg ... rounded-lg` (removendo `sm:rounded-lg`).

### Efeito

- Mobile: dialog ocupa `calc(100% - 2rem)` — 16px de folga em cada lado — com cantos arredondados.
- Desktop: continua limitado a `max-w-lg` (ou ao `max-w-*` que cada uso já sobrescreve via `className`).
- Nenhum dialog individual precisa ser tocado; consumidores que passam `max-w-xl`, `max-w-2xl`, etc. continuam funcionando via merge do `cn`.
