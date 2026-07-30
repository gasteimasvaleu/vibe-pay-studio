## Problema

Nas listas de produtos das estatísticas (`/my-monetisex-stats`), cada linha tem uma bolinha colorida antes do nome do produto ("Videochamada", "Mimo", "Live"...).

Verifiquei o código: em `src/routes/_authenticated/my-monetisex-stats.tsx` a bolinha aparece em três lugares e **só um deles** tem proteção contra encolhimento:

- linha 1024 (tabela "Ganhos por produto"): `h-2 w-2 shrink-0 rounded-full` — correto
- linha 640 (lista "Ganhos por produto" em grid de 3 colunas): `h-2 w-2 rounded-full` — **sem `shrink-0`**
- linha 983 (legenda do card "Ganhos por produto"): `h-2 w-2 rounded-full` — **sem `shrink-0`**

Sem `shrink-0`, um filho flex de largura fixa pode ser comprimido até 0px quando a coluna fica estreita — exatamente o que acontece em telas de celular, onde os rótulos mais longos (como "Videochamada") ocupam toda a largura disponível e empurram a bolinha para fora.

## Correção

1. Adicionar `shrink-0` às bolinhas das linhas 640 e 983.
2. Adicionar `min-w-0` ao container do rótulo na linha 639, para que o texto encolha/trunque em vez de espremer a bolinha.
3. Auditar o restante do arquivo (e componentes de legenda relacionados, como as legendas dos gráficos nas linhas 1475-1476 e 1714-1715) para aplicar o mesmo padrão onde houver bolinha fixa ao lado de texto variável.

## Verificação

Abrir `/my-monetisex-stats` em largura de celular e confirmar que a bolinha aparece em todas as linhas de produto, inclusive "Videochamada", sem estouro horizontal.

Se a bolinha que você mencionou for de outra tela (por exemplo, o indicador de presença dentro do chat), me avise que eu ajusto o alvo — nesse caso o diagnóstico acima não se aplica.
