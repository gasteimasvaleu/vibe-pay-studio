## Objetivo

Substituir a barra fixa "Salvar" desta página pelos dois botões **Salvar** e **Cancelar** no mesmo padrão das outras páginas de settings (empilhados, `w-full`, roxos, dentro do `main`).

## Alterações

**`src/routes/_authenticated/settings.subscription.tsx`**

1. **Remover a barra fixa** `<div className="fixed inset-x-0 bottom-0 …">…</div>` no final e o `pb-28` do `main`.
2. **Adicionar `handleCancel`** que restaura `monthly`, `discountQ` e `discountS` aos valores de `initial`.
3. **Adicionar `dirty`**: `monthly !== initial.monthly || discountQ !== initial.discountQ || discountS !== initial.discountS`.
4. **Ajustar `canSave`** para exigir também `dirty` (evita salvar sem mudanças).
5. **Renderizar dentro do `main`**, após os campos de desconto:
   ```tsx
   <div className="flex flex-col gap-3 pt-2">
     <Button
       type="button"
       onClick={handleSave}
       disabled={!canSave}
       className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
     >
       {saving ? "Salvando…" : "Salvar"}
     </Button>
     <Button
       type="button"
       onClick={handleCancel}
       disabled={!dirty || saving}
       className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
     >
       Cancelar
     </Button>
   </div>
   ```

Sem mudanças de schema, server functions, ou na lógica de cálculo/salvamento existente.
