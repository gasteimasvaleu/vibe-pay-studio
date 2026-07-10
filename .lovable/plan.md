## Objetivo
Ao clicar no card "Adicionar novo banco" na página `/banco`, abrir o formulário "Cadastrar Dados Bancários" dentro de um **Sheet vindo de baixo para cima** (bottom sheet) em vez de navegar para a rota `/banco/cadastrar`.

## Mudanças

### `src/routes/_authenticated/banco.tsx`
- Importar `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` de `@/components/ui/sheet`.
- Adicionar state `cadastroOpen`.
- Trocar o `<Link to="/banco/cadastrar">` do card "Adicionar novo banco" por `<button onClick={() => setCadastroOpen(true)}>` (mesmo visual).
- Renderizar `<Sheet open={cadastroOpen} onOpenChange={setCadastroOpen}>` com:
  - `<SheetContent side="bottom" className="h-[90vh] rounded-t-2xl overflow-y-auto p-0">`
  - Header sticky no topo (botão `ArrowLeft` à esquerda que chama `setCadastroOpen(false)`, título centralizado "Cadastrar Dados Bancários", espaçador à direita).
  - Corpo: `<CadastrarBancoForm onClose={() => setCadastroOpen(false)} />`.

### Novo componente: `src/components/banco/CadastrarBancoForm.tsx`
- Extrair o formulário (Banco, Tipo de conta, Agência, Número da conta, Tipo de chave Pix, Chave Pix + botões Voltar/Salvar) do arquivo `banco.cadastrar.tsx`.
- Props: `onClose: () => void`.
- Botão "Voltar" e submit chamam `onClose()`.
- Mantém `BANCOS`, `PIX_PLACEHOLDERS`, ícones e estilos idênticos.

### `src/routes/_authenticated/banco.cadastrar.tsx`
- Manter a rota como fallback via URL direta, simplificando para reusar `CadastrarBancoForm` com `onClose = () => router.history.back()`.

## Detalhes técnicos
- Sem alterações de backend/dados — apenas UI.
- Usa `Sheet` do shadcn com `side="bottom"` (bottom sheet).
- Preserva design system (tokens semânticos).

## Arquivos alterados/criados
- **novo** `src/components/banco/CadastrarBancoForm.tsx`
- **editar** `src/routes/_authenticated/banco.tsx`
- **editar** `src/routes/_authenticated/banco.cadastrar.tsx`
