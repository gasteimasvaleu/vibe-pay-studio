## Alteração: Cards CTA em estilo "glass claro"

Ajustar `src/components/landing/GlassPromoCard.tsx` para adotar a mesma linguagem visual do `HeroCard`/`LoginCard` (fundo branco translúcido com blur), removendo o efeito de brilho roxo atual e trocando as fontes brancas por pretas.

### Mudanças em `GlassPromoCard.tsx`

- Substituir `bg-white/15` por um fundo branco mais opaco (`bg-white/70`) mantendo `backdrop-blur-2xl` — mesmo efeito "glass" usado nos cards de login/promocional durante o scroll.
- Ajustar borda para `border-white/60` e sombra suave (`shadow-xl`), removendo o `boxShadow` roxo customizado (`0 20px 60px -20px rgba(120,40,200,...)`) e o inset branco.
- Remover os dois blobs radiais internos (`radial-gradient` branco/roxo) e o `outer bubble glow` roxo (`absolute -inset-2 ... from-white/20 via-purple-300/10 ...`).
- Trocar as cores de texto:
  - eyebrow: `text-purple-700` (mantém hierarquia da marca)
  - title: `text-black`
  - body: `text-neutral-800`
  - footer: `text-neutral-600` com borda `border-black/10`
- Remover as constantes `TITLE_SHADOW` e `TEXT_SHADOW` e todos os `style={{ textShadow: ... }}` — sem sombra de fonte.

Nenhuma alteração em `ScrollLanding.tsx`, `LoginCard.tsx` ou `HeroCard.tsx`.

### Arquivo envolvido

- `src/components/landing/GlassPromoCard.tsx`
