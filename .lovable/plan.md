## Dialog de confirmação para "Excluir conta"

Ao clicar no botão **Excluir conta** em `/settings/myprofile`, abrir um dialog de confirmação seguindo o modelo do screenshot, adaptado às cores do site.

### Alterações

**`src/routes/_authenticated/settings.myprofile.tsx`**
- Importar `AlertDialog` (shadcn) e ícone `AlertCircle` do lucide-react.
- Adicionar `useState` `deleteOpen` para controlar abertura.
- Envolver o botão "Excluir conta" com `AlertDialogTrigger` (ou setar `onClick` que abre o dialog).
- Adicionar o `AlertDialog` no final da página com:
  - Ícone circular de alerta (AlertCircle) no topo, cor `text-primary` (dourado/âmbar do tema do site).
  - Título grande e bold: **"Deseja continuar?"**
  - Descrição: **"Ao continuar, sua conta e os dados associados serão excluídos."**
  - Botão "X" para fechar no canto superior direito.
  - Ações: **Cancelar** (ghost/link) e **Continuar** (variante padrão com bg `bg-muted` / arredondado full, seguindo o estilo do print).
- O botão "Continuar" por enquanto apenas mostra `toast.info("Em breve")` e fecha o dialog (não implementa exclusão real — fora do escopo desta task de UI).

### Estilo
- Card branco arredondado (`rounded-3xl`), sombra suave, centralizado, largura `max-w-md`.
- Usar tokens semânticos do design system (`bg-background`, `text-foreground`, `text-primary`, `bg-muted`) — sem cores hardcoded.
- Botões arredondados full (`rounded-full`), altura confortável (`h-12`).
