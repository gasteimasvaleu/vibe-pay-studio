## Ajuste

Trocar o `Dialog` central usado em `CommentsSheet.tsx` pelo componente `Sheet` (`@/components/ui/sheet`) do padrão do app, ancorado na parte inferior — o mesmo padrão já usado em `publisher.tsx`, `banco.tsx`, etc.

## Mudanças em `src/components/feed/CommentsSheet.tsx`

- Substituir `Dialog` / `DialogContent` por `Sheet` / `SheetContent side="bottom"`.
- `SheetContent` com `className` que:
  - Fixa altura ~85vh (`h-[85vh]`).
  - Cantos superiores arredondados (`rounded-t-3xl`).
  - `flex flex-col p-0 gap-0` para acomodar header / lista / input.
- Manter o mesmo layout interno:
  - Header "Comentários" (o `SheetContent` já traz um botão de fechar padrão do app).
  - Área rolável com estado vazio ("Ainda não há nenhum comentário / Inicie a conversa.") ou lista.
  - Barra inferior fixa com avatar + input arredondado + botão enviar.
- Remover imports não usados (`Dialog`, `DialogContent`).

Sem mudanças de backend, sem mudanças em `feed.tsx` ou `PublicationCard.tsx` — a API do componente (`open`, `onOpenChange`, `publicationId`, `commentsDisabled`, `onCountChange`) permanece idêntica.

## Arquivos alterados

- `src/components/feed/CommentsSheet.tsx`