## Problema

Em `src/routes/_authenticated/banco.tsx` (linhas 245–248) o wrapper aplica uma camada absoluta `bg-card` que pinta a página inteira com a cor de card, e o header também usa `bg-card`. As outras páginas do app (feed, dashboard, my-monetisex-stats, banco.cadastrar) usam o `--background` padrão do body e header com `bg-background/90 backdrop-blur`, criando um contraste sutil entre header e conteúdo. Por isso o `/banco` parece "mais claro/uniforme" do que o resto.

## Correção (apenas visual, sem tocar em lógica)

Em `src/routes/_authenticated/banco.tsx`:

1. Remover a camada de fundo forçada:
   - Deletar `<div className="absolute inset-0 bg-card" />` (linha 246).
2. Ajustar o wrapper para não precisar de posicionamento absoluto:
   - Trocar `<div className="relative min-h-screen text-foreground overflow-hidden">` por `<div className="min-h-screen bg-background text-foreground">`.
3. Alinhar o header ao padrão do resto do app:
   - Trocar `className="relative z-10 border-b border-border bg-card"` por `className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur"`.
4. Remover as classes `relative z-10` que só existiam por causa da camada absoluta — no `<main>` (linha 270), passa a ser `className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-8"`.

## O que NÃO muda

- Nenhuma alteração nos cards internos (`bg-card` neles continua correto — é o contraste com o `bg-background` do body que devolve a aparência das outras rotas).
- Nenhuma mudança em queries, mutations, mutation de saque, diálogos (`SacarDialog`, `CadastrarBancoForm`, sheet de info) ou lógica de estado.
- Tokens de tema (`--background`, `--card`) permanecem intocados — light e dark mode seguem funcionando via os tokens já definidos em `src/styles.css`.
