## Goal
Add a visual separator line below the message textarea in the mass-message composer, so the message input area is clearly separated from the icon toolbar (media, audio, schedule, GIF, emoji, tag) below it.

## Scope
- `src/routes/_authenticated/chat-agendamento.tsx` only.
- The Composer component's right column message area.
- No functional changes; purely presentational.

## Implementation
1. Locate the `Textarea` element and the icon toolbar row inside the Composer's right section.
2. Insert a horizontal separator between them using the theme's border color:
   - Option A: wrap the `Textarea` in a container with `border-b border-border pb-2` (or equivalent spacing).
   - Option B: add a `<div className="border-b border-border" />` immediately after the `Textarea` and before the `TooltipProvider`/`flex` icon row.
3. Preserve existing padding, spacing, focus styles, and dark-mode compatibility by using `border-border` (no hardcoded colors).

## Acceptance
- The composer page shows a visible line directly under the message textarea.
- The icon row remains below the line.
- Existing spacing and layout behavior are unchanged.