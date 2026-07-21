## Objetivo
Remover o header superior (`AppTopBar`) da página `/chat`, deixando a tela de conversas com o próprio cabeçalho interno "Conversas" e sem a barra global de navegação.

## Alterações propostas

### 1. `src/routes/_authenticated/chat.tsx`
- Remover o import de `AppTopBar`.
- Remover a chamada `<AppTopBar />` dentro do `return` do layout.
- Ajustar as alturas dos containers que hoje descontam `61px` do header:
  - `<div className="max-w-6xl mx-auto grid ... min-h-[calc(100svh-61px)]">` → `min-h-svh`
  - `<section className={... "min-h-[calc(100svh-61px)]"}>` → `min-h-svh`

## Resultado esperado
- A rota `/chat` passa a ocupar a altura total da viewport sem o header global.
- O conteúdo interno (sidebar "Conversas" + área de mensagens) permanece inalterado.
- Outras rotas que usam `AppTopBar` não são afetadas.