## Objetivo
Alterar a UX da página de live (transmissão e visualização) para usar o tema claro no chrome ao redor do vídeo, mantendo apenas a área do player em preto (necessário para letterboxing).

## Escopo
Apenas o layout **desktop** das rotas de live. O layout mobile permanece imersivo/escuro (padrão de apps de live).

## Arquivos afetados
- `src/routes/_authenticated/live.$liveId.transmitir.tsx` (layout desktop, ~linhas 611-633)
- `src/routes/_authenticated/live.$liveId.index.tsx` (layout desktop do viewer)
- `src/components/live/LiveChat.tsx` (variante `card` já usa `bg-card` — validar)
- `src/components/live/LiveDonorsPanel.tsx` (validar variante `card`)

## Mudanças

### Header da página desktop
- Botão "Voltar": trocar `text-white/80 hover:text-white` por `text-foreground/70 hover:text-foreground`.
- Wrapper externo: garantir `bg-background text-foreground` para sobrepor qualquer herança escura.

### Área do player
- Manter `bg-black` apenas no container do `<video>` (necessário para vídeo).
- Overlays sobre o vídeo (top bar, badges "AO VIVO", contador de viewers) continuam com `bg-black/45` — ficam legíveis sobre o vídeo.

### Sidebar direita (Top Apoiadores + Chat)
- `LiveDonorsPanel` variante `card` e `LiveChat` variante `card` já usam tokens `bg-card`; garantir borda `border` visível no tema claro.

### Viewer (`live.$liveId.index.tsx`)
- Aplicar o mesmo tratamento do transmitir no layout desktop (wrapper `bg-background`, header claro, sidebar clara).
- Estado "Carregando..." (linha 85): trocar `bg-black` por `bg-background text-muted-foreground`.

## Fora do escopo
- Layout mobile (fullscreen imersivo permanece escuro).
- Overlays sobre o vídeo (permanecem `bg-black/45` para contraste).
- Tema global do app.