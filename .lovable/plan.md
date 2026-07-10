## Problema

O card "Saldo na carteira" tem um `<Link to="/mywallet/extrato">` envolvendo tudo, e dentro dele há outro `<Link to="/mywallet/recarregar">` (o botão Recarregar). HTML não permite `<a>` aninhado — o navegador quebra a estrutura, e nenhum dos dois links funciona de forma confiável.

## Correção em `src/routes/_authenticated/mywallet.tsx`

Remover o aninhamento, mantendo os dois destinos clicáveis:

1. Trocar o `<Link>` externo do card por uma `<div>` (mesmas classes visuais, sem `hover:bg-accent/40` pra não parecer clicável inteiro).
2. Envolver **apenas** a área do saldo (label "Saldo na carteira", valor `R$ -`, texto de apoio) e o `ChevronRight` em um `<Link to="/mywallet/extrato">` — essa é a área que abre o extrato.
3. Deixar o botão **Recarregar** como um `<Button asChild><Link to="/mywallet/recarregar">…</Link></Button>` irmão, fora do link do extrato. Sem `stopPropagation`, já que não há mais link pai.

Resultado: clicar no saldo/seta abre `/mywallet/extrato`; clicar em Recarregar abre `/mywallet/recarregar`.

Nenhum outro arquivo muda.