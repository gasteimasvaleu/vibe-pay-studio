## Objetivo
Transformar o botão "Mais opções" (ícone de três pontos) no header da página de perfil em um gatilho que abre um `Sheet` deslizando pela esquerda, com as opções exibidas no screenshot: **Compartilhar**, **Denunciar perfil** e **Adicionar amigo**.

## Arquivo alvo
- `src/routes/_authenticated/perfil.$username.tsx`

## Alterações propostas

1. **Importar componentes e ícones**
   - Adicionar `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetTrigger` de `@/components/ui/sheet`.
   - Adicionar ícones `Share2`, `Flag` e `UserPlus` do `lucide-react`.

2. **Adicionar estado local**
   - Criar `const [menuOpen, setMenuOpen] = useState(false);` no componente `PerfilPage`.

3. **Envolver o botão de opções**
   - Substituir o `<button>` do header por `<SheetTrigger asChild>` mantendo o botão atual.
   - Conectar o estado do Sheet ao botão.

4. **Renderizar o Sheet à esquerda**
   - Inserir `<SheetContent side="left">` após o `SheetTrigger`.
   - Usar `SheetHeader` + `SheetTitle` com título "Opções".
   - Criar lista de ações com três itens:
     - **Compartilhar** (ícone `Share2`) — usa `navigator.share` quando disponível; fallback para copiar URL da página via `navigator.clipboard`.
     - **Denunciar perfil** (ícone `Flag`) — exibe um `alert` ou `confirm` informativo (placeholder para futura integração real).
     - **Adicionar amigo** (ícone `UserPlus`) — exibe um `alert` de confirmação (placeholder para futura integração real).
   - Cada item deve ocupar a largura total, ter hover visual e texto preto/alta opacidade para manter consistência com o header branco recém-alterado.

5. **Manter comportamentos existentes**
   - Preservar o botão de voltar e o título centralizado.
   - Não alterar lógica de assinatura, posts, estatísticas ou diálogos de pagamento.

6. **Verificação**
   - Rodar `bun run build:dev` para garantir que não haja erros de tipo ou importação.

## Notas
- O componente `Sheet` do projeto já suporta `side="left"` nativamente (`src/components/ui/sheet.tsx`).
- As ações de denunciar e adicionar amigo serão placeholders visuais; a integração real com backend pode ser feita em seguida se solicitado.