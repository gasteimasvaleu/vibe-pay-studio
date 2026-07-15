## Diagnóstico

`publications.preview_url` já é salvo no publisher para posts `paid`/`challenge`, mas o feed nunca devolve nem exibe esse campo. Em `PublicationCard`, quando `item.locked`, só aparece um overlay preto com cadeado — a prévia fica invisível.

## Correção

### 1. `src/lib/publications.functions.ts`

- Adicionar `preview_url: string | null` no tipo `FeedItem`.
- Em `getFeed` e `getUserPublications`, incluir `preview_url` no `select(...)` de `publications`.
- Ao montar cada item: `preview_url: (p.visibility === 'paid' || p.visibility === 'challenge') ? p.preview_url ?? null : null`.

### 2. `src/components/feed/PublicationCard.tsx`

Quando `item.locked` e existir `item.preview_url`, mostrar a imagem da prévia **totalmente visível** (sem gradiente escuro por cima). Sobrepor apenas um cadeado discreto/translúcido e o CTA de desbloqueio/desafio.

```tsx
{item.locked ? (
  item.preview_url ? (
    <div className="relative aspect-[16/10] bg-black/40">
      <img
        src={item.preview_url}
        alt="Prévia"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <LockedOverlay item={item} onUnlock={onUnlock} hasPreview />
    </div>
  ) : (
    <div className="relative aspect-[16/10] bg-black/40">
      <LockedOverlay item={item} onUnlock={onUnlock} />
    </div>
  )
) : ...}
```

Em `LockedOverlay`, aceitar a nova prop `hasPreview?: boolean`. Quando `hasPreview`:

- **Remover** o `bg-gradient-to-br from-black/70 ...` — sem escurecimento.
- No canto superior direito, exibir apenas um cadeadinho translúcido (`Trophy` no caso de desafio), ex.: `<div className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/20 grid place-items-center text-white/90"><Lock className="h-4 w-4" /></div>`.
- Manter o botão de ação (Desbloquear / Aceitar desafio) ancorado na base do card (`absolute bottom-3 left-1/2 -translate-x-1/2`), sem o bloco central de ícone/título grandes.
- Para desafio, manter a barrinha de progresso logo acima do botão (fundo semitransparente para contraste).

Quando `hasPreview` for falso, comportamento atual permanece (overlay escuro + ícone grande centralizado).

Nada mais na lógica de compra/RLS muda.
