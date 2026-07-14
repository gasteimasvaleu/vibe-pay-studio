
## Objetivo

Quando o usuário confirma o preço no `PriceDialog` (botão **Avançar**) do fluxo de conteúdo pago, abrir um bottom sheet **"Adicionar prévia"** (modelo do screenshot) e permitir escolher/enviar a mídia de prévia de verdade — biblioteca do dispositivo, acervo do app e câmera.

## Escopo

Alterações em `src/routes/_authenticated/publisher.tsx`, `src/lib/publications.functions.ts` e uma migração Supabase para persistir a prévia.

## UX

1. Novo estado `previewSheetOpen` em `PublisherPage`.
2. Ao clicar **Avançar** no `PriceDialog` (paid):
   - fecha o dialog atual;
   - marca `toggles.paid = { enabled: true, priceCents }`;
   - abre `previewSheetOpen`.
3. `PreviewPickerSheet` (novo componente, mesmo padrão visual do `pickerOpen` existente — `Sheet` inferior, `rounded-t-2xl`, `sm:max-w-[420px]`, header "Adicionar prévia" + copy "Para publicar **conteúdo pago**, é necessário definir uma **mídia de prévia**."):
   - `PickerOption` **Biblioteca do dispositivo** → abre `<input type="file" accept="image/*,video/*">` (novo `previewInputRef`, mesmo padrão do `fileInputRef` com `flushSync` para preservar user-gesture).
   - `PickerOption` **Acervo na Privacy** → placeholder por enquanto (`toast.info("Em breve")`) — não existe feature de acervo salvo no app hoje.
   - `PickerOption` **Câmera** → segundo input com `capture="environment"`.
4. Após escolher o arquivo, faz upload no bucket `publications` em `posts/{userId}/drafts/preview-{uuid}.{ext}` reusando `uploadWithProgress` + `createSignedUrl` (mesmo fluxo do `onFiles`). Estado local `preview: { status, previewUrl, storagePath, publicUrl, uploadProgress, type }`.
5. Na etapa 2 (composer), quando `toggles.paid.enabled`, exibir o card "Prévia" com thumbnail (a partir de `preview.previewUrl`) e botão **Editar prévia** que reabre `previewSheetOpen`. Se `preview` estiver ausente e `paid.enabled=true`, `canContinue` fica falso (bloqueia postar).
6. Se o usuário desabilitar o toggle "Conteúdo pago", limpar `preview` e remover o arquivo via `deleteDraftMedia`.

## Backend

- Migração `add_publication_preview.sql`:
  - `ALTER TABLE public.publications ADD COLUMN preview_url text, ADD COLUMN preview_storage_path text;`
  - Sem novas policies (já herdam as existentes de `publications`).
- `createPublication` (`src/lib/publications.functions.ts`):
  - Adicionar ao schema `preview: z.object({ storagePath, url, type: z.enum(["image","video"]) }).nullable().optional()`.
  - No insert, gravar `preview_url` / `preview_storage_path` quando `visibility === "paid"`.
  - Regenerar `src/integrations/supabase/types.ts` manualmente (adicionar os campos em `publications`).
- Client envia `preview` no payload do `mutation.mutate` quando existir.

## Fora de escopo

- Feed / detalhe da publicação exibindo a mídia de prévia bloqueada (o pedido é só o sheet + upload real). Fica para uma próxima iteração.
- Implementação do "Acervo na Privacy" — vira placeholder com `toast.info`.

## Arquivos

- `src/routes/_authenticated/publisher.tsx` — novo sheet, estado `preview`, handlers, thumbnail na etapa 2.
- `src/lib/publications.functions.ts` — schema + insert.
- `src/integrations/supabase/types.ts` — novos campos.
- `supabase/migrations/<timestamp>_add_publication_preview.sql`.
