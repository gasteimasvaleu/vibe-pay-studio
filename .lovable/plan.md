## Dialog "Adicionar nova categoria"

Ambos os botões "+" (o do header "ACERVO" ao lado da lupa, e o "+" que aparece no header direito da aba "Envios") abrem o mesmo dialog.

### Alterações em `src/routes/_authenticated/vault.tsx`

- Novo estado `addCategoryOpen: boolean`.
- Ambos botões `+` passam a chamar `setAddCategoryOpen(true)`.
- Usar `Dialog`/`DialogContent` do `@/components/ui/dialog` (largura `sm:max-w-3xl`, altura mínima ~`min-h-[520px]`, `rounded-3xl`, padding generoso).
- Conteúdo do dialog:
  - Título "ADICIONAR NOVA CATEGORIA" (em bold, uppercase, tracking-wide) no topo à esquerda; botão X no canto superior direito (usar o close do DialogContent existente já serve).
  - `Input` full-width com ícone `Sparkles` (lucide) à esquerda, placeholder "Envios", `rounded-full`, borda sutil, altura `h-12`.
  - Área de mídia: card cinza claro (`bg-muted`) `rounded-2xl` de ~`h-64 w-64`, com ícone `Plus` grande e label "Adicionar mídia" em bold. É um botão (por enquanto apenas visual, sem ação).
  - Footer alinhado à direita com dois botões pill:
    - "Confirmar" — outline `border-primary text-primary`.
    - "Cancelar" — outline `border-foreground text-foreground`.
  - Ambos apenas fecham o dialog (sem persistência).
- Novo estado local `categoryName: string` para o input controlado.
- Sem backend nem lógica de criação real por enquanto.
