## Objetivo
Reposicionar o indicador de bolinhas (pontos de progresso) do componente `CircularSteps` para ficar **acima** do texto "Passo X" (subtitle), centralizado. As setas de navegação (◀ ▶) permanecem na posição atual (abaixo do texto), ocupando sozinhas a linha onde antes estavam junto das bolinhas.

## Arquivo
`src/components/feed/CircularSteps.tsx`

## Mudanças

1. **Remover** o bloco de bolinhas (`<div className="ml-2 flex gap-1.5">...</div>`, linhas 249–263) de dentro da row de navegação.
2. **Inserir** esse mesmo bloco logo antes do `<p>` do subtitle (linha 189), dentro do `motion.div` — porém como as bolinhas não devem re-animar a cada troca de passo, colocá-lo **fora** do `AnimatePresence`, como primeiro filho da coluna "Content" (`src/components/feed/CircularSteps.tsx` linha 180). Assim ficam fixas no topo da coluna de texto.
3. Ajustar o wrapper das bolinhas para centralizar: trocar `ml-2 flex gap-1.5` por `flex justify-center gap-1.5` (mantendo cores/tamanho atuais das barras).
4. **Manter** a row das setas (`flex items-center gap-3` na linha 220) intacta, apenas sem o bloco de bolinhas — as duas setas ocupam a posição onde a linha completa (setas + bolinhas) estava.

## Resultado visual
```text
[● ● ● ● ●]        <- bolinhas centralizadas
PASSO 3
Título
Descrição...
[◀] [▶]            <- setas na mesma posição atual
```

Sem alterações em lógica, cores, dados ou outros componentes.