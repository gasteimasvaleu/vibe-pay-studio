## Objetivo

Substituir o player nativo `<audio controls>` das mensagens de áudio no chat por um player customizado que exibe:
- Ícone de áudio (mic/play) à esquerda
- Barra de progresso (waveform estilizada com barrinhas) no centro
- Duração / tempo atual à direita

Isso vale tanto para o receptor quanto para o remetente, mantendo o esquema de cores (bolha roxa do usuário / bolha branca do outro).

## Escopo

Arquivos afetados:
- `src/routes/_authenticated/chat.$threadId.tsx` (linha ~791) — troca `<audio controls>` por `<AudioBubble />`
- Novo componente: `src/components/chat/AudioBubble.tsx`

Nada de backend, schema ou lógica de envio muda.

## Implementação

**`AudioBubble.tsx`** — componente client-only:
- Recebe `src: string` e `variant: 'mine' | 'theirs'`
- Usa `<audio>` interno oculto (ref) para controlar playback
- Estados: `playing`, `currentTime`, `duration`
- Escuta `loadedmetadata`, `timeupdate`, `ended`
- Layout horizontal (`flex items-center gap-2 px-2 py-1.5 min-w-[220px]`):
  - Botão circular com ícone `Play`/`Pause` (lucide) — cor adapta ao variant
  - Barra de "waveform": 28 divs de altura pseudo-aleatória (seed por src) renderizadas em flex; as barras à esquerda do progresso ficam preenchidas (cor primária/branca), as demais em opacidade baixa. Clique na barra faz seek proporcional.
  - Texto `mm:ss` do tempo atual / duração

**Integração no chat:**
- Substituir a linha 791 por: `return <AudioBubble key={idx} src={mm.url} variant={isMine ? 'mine' : 'theirs'} />;`
- Remover `col-span-2` de dentro; envolver com `<div className="col-span-2">` quando necessário para manter grid.

## Detalhes visuais

- Bolha "mine" (roxa): ícone e barras em `text-white`, barras não-tocadas em `bg-white/30`, tocadas em `bg-white`
- Bolha "theirs" (branca): ícone em `text-primary`, barras não-tocadas em `bg-muted-foreground/30`, tocadas em `bg-primary`
- Altura das barras varia entre 6px–20px, largura 2px, gap 2px
