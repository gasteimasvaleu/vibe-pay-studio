Vou corrigir a navegação da carteira para que a URL e o conteúdo da página mudem juntos.

Plano:
1. Transformar `src/routes/_authenticated/mywallet.tsx` em uma rota pai com `<Outlet />`, porque existem páginas filhas em `/mywallet/extrato` e `/mywallet/recarregar`.
2. Mover o conteúdo atual da carteira para uma nova rota index: `src/routes/_authenticated/mywallet.index.tsx`, mantendo o visual atual do card.
3. Garantir que os links internos continuem apontando para:
   - `/mywallet/extrato` ao clicar no saldo, seta `>` ou “Ver todas as transações”
   - `/mywallet/recarregar` ao clicar em “Recarregar”
4. Não editar `src/routeTree.gen.ts`; ele será regenerado automaticamente pelo TanStack Router.
5. Verificar depois no preview que clicar nos botões troca realmente o conteúdo da tela, não só a URL.

Detalhe técnico:
O problema provável é que `mywallet.tsx` está como rota pai e página ao mesmo tempo. Sem `<Outlet />`, as rotas filhas são reconhecidas, a URL muda, mas o conteúdo filho não aparece.