## Diagnóstico

Após renomear `cadastro.tsx` → `cadastro.index.tsx`, o `routeTree.gen.ts` já regenerou corretamente com as duas rotas registradas:

- `/cadastro/` → `cadastro.index.tsx`
- `/cadastro/confirme-email` → `cadastro.confirme-email.tsx`

O 404 no preview indica que o dev server ficou com módulo antigo em memória após o `mv` (o Vite não detectou o rename como HMR completo).

## Correção

Reiniciar o dev server do sandbox (`code--restart_dev_server`) para forçar re-scan das rotas e recarregar `routeTree.gen.ts` limpo.

Nenhuma alteração de código necessária — o rename já está correto.

## Verificação

Após reiniciar:
- `/cadastro` renderiza o formulário.
- `/cadastro/confirme-email?email=...` renderiza o card "Confirme seu e-mail".
