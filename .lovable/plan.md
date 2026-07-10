## Plan

Add tooltips on hover to the composer icons in `src/routes/_authenticated/settings.chat-settings.tsx`, using the same labels as the existing chat composer:

- `ImageIcon` → "Adicionar mídia"
- `Mic` → "Gravar um áudio"
- `Archive` → "Adicionar mídia do acervo"
- `Smile` → "Adicionar um emoji"
- `Tag` → "Adicionar tag"

Implementation:
- Import `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` from `@/components/ui/tooltip`.
- Wrap the icon toolbar in `<TooltipProvider delayDuration={200}>`.
- Replace each bare icon with a `<Tooltip>` containing a `<TooltipTrigger asChild>` `<button type="button">` around the icon, and a `<TooltipContent>` with the label. Buttons keep the muted color, small hover state, and no-op on click (mock).
