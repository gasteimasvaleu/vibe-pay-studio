## Problema

No TanStack Router (roteamento flat), quando existem os arquivos `cadastro.tsx` **e** `cadastro.confirme-email.tsx`, o primeiro passa a ser tratado como **layout pai** do segundo. Como `cadastro.tsx` renderiza a própria página de cadastro (sem `<Outlet />`), ao navegar para `/cadastro/confirme-email`:

- A URL muda corretamente (você viu isso no preview).
- Mas o componente renderizado continua sendo o formulário de cadastro, porque o "filho" nunca é montado — não há `<Outlet />` no pai.

Isso explica exatamente o sintoma: URL nova, visual antigo.

## Correção

Transformar `/cadastro` em rota folha renomeando o arquivo, para que `cadastro.tsx` e `cadastro.confirme-email.tsx` passem a ser **irmãos** (ambos folhas), e não pai/filho.

Passos:

1. Renomear `src/routes/cadastro.tsx` → `src/routes/cadastro.index.tsx`.
   - O TanStack passa a resolver `/cadastro` pelo `cadastro.index.tsx` e `/cadastro/confirme-email` pelo arquivo já existente, sem relação de layout entre eles.
2. Atualizar o `createFileRoute("/cadastro")` dentro do arquivo renomeado para `createFileRoute("/cadastro/")` (path da index).
3. Deixar o `routeTree.gen.ts` ser regerado automaticamente pelo plugin — não editar manualmente.

Nenhuma outra alteração de conteúdo. Os fluxos de submit e navegação (`navigate({ to: "/cadastro/confirme-email", search: { email } })`) continuam iguais.

## Verificação

- Após o rename, criar uma conta e confirmar que:
  - a URL muda para `/cadastro/confirme-email?email=...`
  - o card exibido é o de "Confirme seu e-mail" (não mais o formulário).
- Voltar para `/cadastro` continua mostrando o formulário normalmente.
