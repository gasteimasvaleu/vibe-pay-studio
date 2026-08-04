# Corrigir a animação de scroll da landing page

## Diagnóstico (verificado no navegador)

A animação em si não quebrou. O que quebrou foi o **carregamento do JavaScript da página inteira**:

```text
Uncaught SyntaxError: The requested module
'/src/routes/_authenticated/subscriptions.tsx?tsr-shared=1'
does not provide an export named 'subscriptionsQueryOptions'
```

Esse erro acontece na inicialização do app, antes da hidratação do React. Resultado observado ao rolar a página `/`:

- o progresso de scroll fica congelado em 0 em qualquer posição (medi opacidade e transform em 0px, 2000px, 4000px e 6000px — todos idênticos);
- os cards (promo, login, hero) nunca aparecem;
- o vídeo de fundo continua rodando porque é HTML puro (autoplay do navegador), o que dá a sensação de "animação rodando sozinha/duas vezes" enquanto o resto está estático.

## Causa

Em `src/routes/_authenticated/subscriptions.tsx`, a constante `subscriptionsQueryOptions` é declarada **sem export** e usada tanto no `loader` quanto no componente. O divisor de rotas do TanStack Start separa esses dois trechos em chunks diferentes e tenta importar a constante do módulo compartilhado, que não a exporta — gerando o SyntaxError que derruba o bundle do cliente em todas as rotas, inclusive a `/`.

## Correção

1. Criar `src/lib/subscriptions.queries.ts` exportando `subscriptionsQueryOptions` (queryKey `["mySubscriptions"]` + `listMySubscriptions`).
2. Em `src/routes/_authenticated/subscriptions.tsx`, remover a constante local e importar do novo módulo, mantendo `loader` e componente inalterados.
3. Revisar os outros arquivos de rota em busca do mesmo padrão (constante local usada por `loader` e componente ao mesmo tempo) e aplicar o mesmo tratamento se houver.

## Validação

- Recarregar `/` e confirmar que não há mais erro no console.
- Rolar a página e confirmar que os cards de vidro, o LoginCard e o HeroCard aparecem nas faixas de scroll corretas e que o texto "Role para descobrir" some no início.

## Escopo

Nenhuma alteração de design, layout ou backend. Somente a organização do módulo que quebra o bundle.
