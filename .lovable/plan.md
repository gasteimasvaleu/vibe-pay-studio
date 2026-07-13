## Alterações no cabeçalho do `PublicationCard`

No canto direito do `<header>` (src/components/feed/PublicationCard.tsx, linha ~91), adicionar dois elementos ao lado do badge "fixado":

1. **Tempo relativo da publicação** (ex.: "agora", "5min", "2h", "3d", "2sem"), calculado a partir de `item.published_at`. Texto pequeno em `text-muted-foreground`.
2. **Botão de menu com ícone `MoreVertical`** (três pontos verticais), que abre um sheet inferior com opções.

## Sheet de opções

Novo componente `PublicationOptionsSheet` em `src/components/feed/PublicationOptionsSheet.tsx`, usando o `Sheet` do shadcn com `side="bottom"`, seguindo o mesmo padrão visual do `CommentsSheet`:

- Largura total no mobile, `sm:max-w-[480px] sm:mx-auto` no desktop
- Cantos superiores arredondados (`rounded-t-3xl`)
- Handle bar cinza no topo
- Animação de entrada suave (slide-up + fade). O shadcn `Sheet` já anima; garantir `duration-300` e easing consistente com o `CommentsSheet`.

Opções listadas (conforme screenshot), cada uma como botão com ícone `lucide-react` à esquerda + label:

- Copiar link — copia URL do post para clipboard (`navigator.clipboard`), toast de sucesso
- Adicionar/Remover dos favoritos — reutiliza `toggleBookmark` (rótulo dinâmico via `item.saved_by_me`)
- Editar legenda — placeholder, toast "em breve"
- Desabilitar/Habilitar comentários — placeholder, toast "em breve" (rótulo dinâmico via `item.comments_disabled`)
- Arquivar post — placeholder, toast "em breve"
- Excluir post — destacado em vermelho (bg vermelho suave, texto/ícone `text-destructive`), placeholder toast "em breve"

## Detalhes técnicos

- Adicionar helper `formatRelativeTime(iso: string)` inline no card (retorna "agora" / "Nm" / "Nh" / "Nd" / "Nsem").
- Estado local `optionsOpen` no `PublicationCard` controla o sheet.
- O sheet recebe `item`, `open`, `onOpenChange`, e callbacks (`onToggleBookmark`, `onCopyLink`, etc.).
- Manter o badge "fixado" existente antes do tempo/menu.
- Nenhuma mudança de lógica de negócio além do já existente (bookmark + copiar link).