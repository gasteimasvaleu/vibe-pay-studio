## Problema

Em `src/routes/_authenticated/my-monetisex-stats.tsx` a página injeta uma camada de fundo `bg-card` (linha 179) e um header também `bg-card` (linha 180). Isso deixa a página com um tom levemente diferente das outras rotas autenticadas (ex.: `/feed`, `/perfil/...`, `/dashboard`), que renderizam direto sobre `--background` do body sem essa sobreposição — a diferença fica sutil no light mode e mais visível no dark.

## Mudança

Alinhar o fundo desta rota ao padrão das demais páginas de conteúdo do app.

1. Remover o `<div className="absolute inset-0 bg-card" />` (linha 179).
2. Trocar o wrapper externo de `relative min-h-screen text-foreground overflow-hidden` para `min-h-screen text-foreground` (deixa o `--background` do body aparecer, como no `/feed` e no `/dashboard`).
3. Ajustar o header (linha 180) de `bg-card` para `bg-background/90 backdrop-blur` — mesmo padrão do header sticky do `publisher.tsx`, para manter a legibilidade quando o usuário rola.
4. Remover o `relative z-10` do `<main>` (não é mais necessário sem a camada absoluta).

Escopo estritamente visual — nenhuma alteração de lógica, dados ou abas.

## Verificação

- Abrir `/my-monetisex-stats` no light e dark mode e confirmar que o fundo agora bate com `/feed` e `/dashboard`.
- Rolar a página e confirmar que o header sticky continua legível sobre o conteúdo.
