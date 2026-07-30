## Objetivo

A página `/em-alta` deve mostrar apenas os carrosséis de destaques — sem o card de perfil do usuário ("Ver perfil → / Monetisexy / @monetisexy / 0 Superfãs") e sem a barra superior "Meu painel".

## Situação atual

`src/routes/_authenticated/em-alta.tsx` envolve todo o conteúdo em `DashboardShell`, que sempre renderiza:
- um `<header>` fixo com botão Voltar, título "Meu painel" e link "Feed";
- o `ProfileHeaderCard` acima do `children`.

Como o shell é compartilhado com o dashboard e outras páginas, não dá para simplesmente apagar esses blocos.

## Mudanças

1. **`src/components/dashboard/DashboardShell.tsx`**
   - Adicionar duas props opcionais: `title?: string` (padrão "Meu painel") e `hideProfileCard?: boolean`.
   - Renderizar o `ProfileHeaderCard` apenas quando `hideProfileCard` não estiver ativo.
   - Usar `title` no `<h1>` do cabeçalho.
   - Comportamento atual de todas as outras páginas permanece idêntico (props ausentes = mesmo resultado de hoje).

2. **`src/routes/_authenticated/em-alta.tsx`**
   - Passar `hideProfileCard` e `title="Em alta"` para o `DashboardShell`, mantendo o botão Voltar e o fundo/largura já usados pelas seções (assim o alinhamento lateral recém-ajustado continua igual).
   - Como `username`, `avatarUrl` e `isCreator` deixam de ser exibidos, o `beforeLoad` pode ser simplificado para apenas checar a sessão, sem a consulta ao `profiles` (menos uma query por navegação).

## Ponto a confirmar

O cabeçalho ficará como uma barra enxuta com o botão Voltar e o título "Em alta". Se você preferir remover a barra inteira (sem título e sem botão voltar), é só dizer — nesse caso a página passa a depender só da navegação global.
