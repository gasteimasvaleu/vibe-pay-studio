## Mudanças

### 1. `src/components/feed/PublicationCard.tsx`
- Nova prop opcional `onTip?: (item: FeedItem) => void`.
- Adicionar botão de mimo (`Gift`, lucide) à direita do botão de comentar, dentro da barra de ações.
- Mover a barra de ações para fora do bloco `{!item.locked && ...}` — ela precisa aparecer também em publicações bloqueadas (para permitir mimo). Curtir/comentar/salvar continuam habilitados; nada muda no visual do overlay de lock.
- Botão de mimo visível quando `!item.is_owner` (não faz sentido mimar a si mesmo — server já bloqueia).

### 2. `src/routes/_authenticated/feed.tsx`
- Estado `tipFor: FeedItem | null`.
- Passar `onTip={setTipFor}` ao `PublicationCard`.
- Renderizar `<TipDialog open={!!tipFor} onOpenChange={v=>!v && setTipFor(null)} creatorId={tipFor.author_id} creatorName={tipFor.author_username ?? "creator"} publicationId={tipFor.id} />`.

### 3. `src/routes/_authenticated/perfil.$username.tsx`
- Mesma integração (`tipFor` + `TipDialog`) para os `PublicationCard` da aba Postagens.

### Fora de escopo
Sem mudanças no `TipDialog`, servidor ou schema.
