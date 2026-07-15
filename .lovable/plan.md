## Objetivo

Ao clicar em uma mídia na aba **Mídias** do perfil, abrir um dialog em tela cheia com a mídia e ações — inspirado no screenshot da Privacy, adaptado ao tema do app (fundo preto translúcido, cantos arredondados, cores/tokens do design system).

## Layout do dialog (adaptado ao tema)

```text
┌────────────────────────────────────────────────┐
│ 09/07/2026                       [🔍]   [✕]    │  ← header sobre a mídia
│                                                │
│              [ MÍDIA (img/vídeo) ]             │  ← ocupa a área central
│                                                │
│ R$ 0,00 Mimos • 0 like        [ Abrir post ]   │  ← footer sobre a mídia
└────────────────────────────────────────────────┘
```

- Fundo: overlay preto translúcido (`bg-background/95` em dark, `bg-black/80` universal).
- Header transparente sobre a mídia: data formatada `dd/MM/yyyy` à esquerda, botão de busca (ícone `Search`, sem ação por ora — placeholder visual como no ref) e `X` para fechar à direita.
- Mídia centralizada, `object-contain`, max-h da viewport, com controles nativos se for vídeo.
- Footer transparente: à esquerda, "R$ {tips} Mimos • {likes} like"; à direita, botão pill "Abrir post" que fecha o dialog e navega para o post.
- Bottom nav do app continua visível por baixo (o dialog não cobre o `BottomNav`), igual ao screenshot.

## Comportamento

1. Clique em um item do grid (`MediasSection` em `src/routes/_authenticated/profile.$username.tsx`) abre o dialog para aquele `GridMediaItem`.
2. Estado local `openMedia: GridMediaItem | null` controla o dialog. Fechar via `X`, clique no backdrop, ou tecla Esc.
3. **Ir para post** ("Abrir post"): navega para `/profile/$username` (mesmo perfil, aba Posts) com hash `#pub-{publication_id}` e faz `scrollIntoView` no `PublicationCard` correspondente.
   - Como o perfil já está aberto, apenas: fecha o dialog, força `activeTab = "posts"`, e após render faz `document.getElementById('pub-{id}')?.scrollIntoView({ behavior: 'smooth', block: 'start' })`.
   - `PublicationCard` recebe um wrapper `<div id={"pub-" + item.id}>` para permitir o scroll.

## Dados de likes/mimos no dialog

`GridMediaItem` hoje não tem contadores. Para não ampliar escopo, o footer exibirá **"R$ 0,00 Mimos • 0 like"** estático (igual ao ref). Se quiser valores reais depois, estendemos `getUserMediasGrid` para incluir `tips_total_cents` e `likes_count` por publicação — deixo como próximo passo opcional.

## Arquivos a editar

- **`src/routes/_authenticated/profile.$username.tsx`**
  - Em `MediasSection`, trocar o `<Link>` de cada item por um `<button>` que chama `onOpen(item)`.
  - Estado `openMedia` e renderização do novo `<MediaLightbox />`.
  - No `PostsList`, envolver cada `PublicationCard` em `<div id={"pub-" + item.id}>` para o scroll.
  - Adicionar `useEffect` que, quando `activeTab === "posts"` e existir `location.hash`, faz scroll para o elemento.

- **Novo `src/components/feed/MediaLightbox.tsx`**
  - Props: `item: GridMediaItem | null`, `onClose()`, `onOpenPost(publicationId: string)`.
  - Usa `<Dialog>` do shadcn com `DialogContent` custom (sem borda, fundo transparente, max-w tela).
  - Ícones `Search`, `X` do `lucide-react`.
  - Data formatada com `Intl.DateTimeFormat('pt-BR')`.

## Fora de escopo

- Busca funcional no header do dialog (apenas ícone visual).
- Contadores reais de mimos/likes (mostra 0 por ora, como no ref).
- Rota dedicada de post individual — reusamos a aba Posts do próprio perfil.
