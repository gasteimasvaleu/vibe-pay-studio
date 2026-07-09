## Objetivo

Adicionar uma **bottom navbar fixa** (mobile-first, visível em todas as larguras nas áreas autenticadas) com 5 itens, seguindo o layout do screenshot mas adaptada à paleta do app (fundo escuro + gradient fúcsia/roxo).

## Itens da navbar (esquerda → direita)

1. **Feed** — ícone `Smartphone` → `/feed`
2. **Em alta** — ícone `TrendingUp` → `/em-alta` (rota ainda não existe; o link fica apontando mas sem criar rota nova nesse passo — vira placeholder `#` até definirmos)
3. **Postar** (centro, destaque) — ícone `Plus` dentro de um círculo com `bg-gradient-to-br from-fuchsia-500 to-purple-600` e `shadow-glow` → ação futura (placeholder `button`)
4. **Chat** — ícone `MessageCircle` → placeholder
5. **Minha carteira** — ícone `Wallet` → placeholder

> Rotas inexistentes ficam como `<button>` para não quebrar o type-safe routing do TanStack. Só `/feed` fica como `<Link>` real.

## Onde adicionar

Novo componente `src/components/site/BottomNav.tsx` renderizado dentro de `src/routes/_authenticated/route.tsx` (layout autenticado), logo após o `<Outlet />`, para aparecer em `/feed`, `/dashboard`, `/perfil/...`, etc.

Adicionar `pb-24` (space para não sobrepor conteúdo) no wrapper do `_authenticated/route.tsx` ou classe utilitária no body do layout.

## Estilo (adaptado ao app)

- Container: `fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-black/70 backdrop-blur-xl`
- Wrapper interno: `max-w-3xl mx-auto px-4 h-16 grid grid-cols-5 items-center`
- Itens laterais: coluna vertical, ícone (`h-5 w-5`) + label (`text-[11px]`), `text-white/60`, ativo → `text-white`
- Botão central "Postar": círculo `h-12 w-12 -mt-6 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 shadow-lg shadow-fuchsia-500/40`, ícone `Plus` branco, label "Postar" abaixo em `text-white/80 text-[11px]`
- Estado ativo determinado por `useRouterState({ select: s => s.location.pathname })`

## Fora de escopo

- Criar rotas `/em-alta`, `/chat`, `/carteira`, `/postar` (só placeholders)
- Alterar navbar superior existente
- Mudar layout de páginas além do padding-bottom necessário

## Arquivos

- **novo**: `src/components/site/BottomNav.tsx`
- **editar**: `src/routes/_authenticated/route.tsx` (render do `<BottomNav />` + padding)
