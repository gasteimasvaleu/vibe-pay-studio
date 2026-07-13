## Objetivo
Exibir um aviso estilo banner no topo central da tela ao favoritar ou desfavoritar uma publicação, conforme o screenshot enviado (fundo verde claro, texto "Post favoritado" centralizado).

## Problema atual
O projeto já chama `toast.success(...)` do `sonner` no `PublicationCard`, mas o componente `<Toaster />` nunca foi renderizado no layout. Por isso nenhum toast aparece.

## Alterações propostas

### 1. Adicionar tokens semânticos de sucesso
**Arquivo:** `src/styles.css`
- Criar `--success` e `--success-foreground` no `:root` com tom verde claro/escuro equivalente ao do screenshot.
- Registrar as cores no `@theme inline` para poderem ser usadas via Tailwind (`bg-success`, `text-success-foreground`).

### 2. Configurar o Toaster como banner no topo
**Arquivo:** `src/components/ui/sonner.tsx`
- Adicionar `position="top-center"`.
- Customizar `toastOptions.classNames.toast` para ocupar a largura total do topo, sem bordas arredondadas inferiores, fundo `--success`, texto `--success-foreground`, texto centralizado e padding generoso.
- Ajustar `duration` para ~2500 ms.

### 3. Renderizar o Toaster globalmente
**Arquivo:** `src/routes/__root.tsx`
- Importar `{ Toaster }` de `@/components/ui/sonner`.
- Inserir `<Toaster />` dentro de `RootComponent`, junto ao `QueryClientProvider` / `ThemeInit`.

### 4. Ajustar textos do favoritar
**Arquivo:** `src/components/feed/PublicationCard.tsx`
- Manter as mensagens existentes mas garantir que:
  - Favoritar → `"Post favoritado"`
  - Desfavoritar → `"Post removido dos favoritos"`
- Remover o `toast.success` redundante do `PublicationOptionsMenu` ou garantir que ambos os caminhos (botão de salvar e menu de opções) disparem o mesmo toast.

### 5. Verificar outros usos de toast
**Arquivo:** `src/components/feed/PublicationOptionsMenu.tsx`
- Manter `toast.success("Link copiado")` e `toast("Em breve")` — agora passarão a funcionar com o Toaster global.

## Resultado esperado
Ao clicar no ícone de bookmark (salvar) de qualquer publicação, um banner verde aparece no topo central da tela com a mensagem apropriada e some automaticamente após poucos segundos.