Envolver o bloco "Voltar + Mensagem em massa" (aside esquerdo do composer em `/chat-agendamento`) em um `<header>` com a mesma altura do header da direita (`h-16`), padding horizontal equivalente (`px-6`) e `border-b border-border` para criar a linha divisória harmônica entre as duas colunas.

## Alterações

**Arquivo:** `src/routes/_authenticated/chat-agendamento.tsx`

1. No `aside` esquerdo (linha ~351), remover o `p-6` do container e trocar o `div` que contém o botão Voltar + título por um `<header className="h-16 flex items-center gap-2 px-6 border-b border-border shrink-0">`.
2. Envolver o restante do conteúdo do aside (busca, filtros, card informativo, botão Aplicar filtro) em um `<div className="flex-1 flex flex-col overflow-y-auto p-6">` para preservar o padding original e o scroll.
3. Manter o header direito `"Selecionar usuários..."` como está (`h-16` equivalente via `py-4`) — se necessário ajustar para `h-16 flex items-center justify-center` para casar exatamente a altura.

Resultado: os dois headers ficam alinhados na mesma linha horizontal, com divisórias contínuas.