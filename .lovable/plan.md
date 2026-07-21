## Adicionar opção de apagar oferta inativa

Na aba **Inativas** de `/promotions`, cada card ganha um botão "Apagar oferta" (mesmo estilo do "Encerrar oferta" das ativas), com confirmação antes de excluir.

### Backend
- Em `src/lib/promotions.functions.ts`, adicionar server function `deletePromotion` (POST, `requireSupabaseAuth`) que:
  - Recebe `{ id: uuid }`.
  - Faz `delete` em `promotions` com `id = data.id` e `creator_id = userId` (RLS já garante ownership).
  - Só permite apagar promoções cujo `status != 'active'` (ou `ends_at < now`) para não apagar oferta ainda ativa por acidente.

### Frontend (`src/routes/_authenticated/promotions.tsx`)
- Importar `deletePromotion` e criar `deleteMutation` (análoga à `endMutation`), invalidando `["my-promotions"]` no sucesso.
- Passar `onDelete` + `deleting` para `PromotionCard`.
- Em `PromotionCard`, quando `!active`, renderizar botão "Apagar oferta" (estilo destrutivo sutil — borda + `text-destructive`) que abre um `confirm` simples (`window.confirm`) antes de disparar `onDelete`.

Sem mudanças de schema — a tabela `promotions` já permite delete via política de owner.
