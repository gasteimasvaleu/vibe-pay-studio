## Ajustar menu do botão de opções

Trocar o `Sheet` lateral por um **Popover** que abre logo abaixo/à esquerda do botão de três pontinhos, com visual de balão (cantos arredondados, fundo bege claro, sombra suave e uma pequena seta apontando para o botão), exatamente como no screenshot.

### Alterações em `src/routes/_authenticated/perfil.$username.tsx`

1. **Imports**
   - Remover: `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetTrigger`.
   - Adicionar: `Popover`, `PopoverContent`, `PopoverTrigger` de `@/components/ui/popover`.
   - Manter os ícones `Share2`, `Flag`, `UserPlus`.

2. **Estado**
   - Renomear `menuOpen` (segue igual, só muda o componente que consome).

3. **Estrutura no header**
   ```tsx
   <Popover open={menuOpen} onOpenChange={setMenuOpen}>
     <PopoverTrigger asChild>
       <button ...><MoreVertical /></button>
     </PopoverTrigger>
     <PopoverContent
       align="end"
       sideOffset={8}
       className="w-64 rounded-3xl bg-[#f5f0e8] border-none shadow-xl p-3 text-black"
     >
       <button className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-black/5 text-lg">
         <Share2 className="w-6 h-6" /> Compartilhar
       </button>
       <button ...><Flag /> Denunciar perfil</button>
       <button ...><UserPlus /> Adicionar amigo</button>
     </PopoverContent>
   </Popover>
   ```
   - `align="end"` alinha a borda direita do popover com o botão (abre para a esquerda).
   - Fundo `#f5f0e8` (bege claro do screenshot), texto preto, ícones outline pretos.
   - Cantos bem arredondados (`rounded-3xl`) e sombra suave (`shadow-xl`).

4. **Handlers**
   - Manter as ações atuais (`navigator.share` / `clipboard`, alerts de denunciar e adicionar amigo). Cada clique fecha o popover via `setMenuOpen(false)`.

5. **Fora de escopo**
   - Sem mudanças em posts, assinaturas, pagamentos, botão de voltar ou título.

### Verificação
- `bun run build:dev` para confirmar que compila.
