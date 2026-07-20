## Objetivo

Substituir a home atual (`/`) por uma landing page de seção única (desktop) com vídeo em background, e cards que aparecem progressivamente conforme o usuário rola — usando **scroll-driven animation** com Framer Motion (`useScroll` + `useTransform`).

## Comportamento (desktop, lg+)

1. Ao carregar, o vídeo de background toca em autoplay (muted, playsInline, loop desativado).
2. Enquanto o vídeo toca, a viewport fica "grudada" (scroll-jack leve via seção alta + posição sticky).
3. Ao terminar o vídeo (ou ao usuário começar a rolar), surgem **3 cards glass promocionais** com efeito bolha de água (backdrop-blur forte + borda translúcida + highlight radial), em fade + float.
4. Conforme o scroll continua, os cards glass permanecem no fundo e por cima aparecem, em ordem:
   - **LoginCard** (o já existente)
   - **HeroCard** (o já existente)
5. Ao fim da seção, o footer aparece normalmente.

No **mobile** (< lg), a landing não é usada: renderiza direto o layout atual (LoginCard + HeroCard empilhados) sem vídeo nem scroll-jack.

## Estrutura técnica

### Novo componente `src/components/landing/ScrollLanding.tsx`

- Wrapper `<section>` com altura ~`400vh` para gerar espaço de scroll.
- Container interno `sticky top-0 h-screen` que fixa a viewport.
- Camadas dentro do sticky:
  1. `<video>` background full-cover (`object-cover`, `autoPlay muted playsInline`), com overlay escuro sutil.
  2. Camada dos 3 cards glass (grid 3 colunas centralizado).
  3. Camada do LoginCard (à esquerda).
  4. Camada do HeroCard (à direita).
- `useScroll({ target: sectionRef })` fornece `scrollYProgress` (0 → 1).
- Ranges de `useTransform`:
  - Vídeo overlay: opacity 0 → 0.3 em [0, 0.25]
  - Cards glass: opacity 0 → 1 em [0.15, 0.35]; translateY 40 → 0
  - LoginCard: opacity 0 → 1 em [0.4, 0.6]; translateX -60 → 0
  - HeroCard: opacity 0 → 1 em [0.65, 0.85]; translateX 60 → 0
- Listener `onEnded` no vídeo dispara um estado que acelera a revelação dos cards glass (caso o usuário ainda não tenha rolado).

### Vídeo

Referenciar direto pela URL fornecida do Supabase (sem upload local):
`https://zyoxtptkmhugxmdzmptd.supabase.co/storage/v1/object/public/criativos/openart-...c141adff.mp4`

### Cards glass

Novo `GlassPromoCard` com:
- `bg-white/10 backdrop-blur-2xl border border-white/25`
- Highlight radial no topo (`bg-[radial-gradient(...)]`)
- Sombra suave `shadow-2xl` com tint roxo
- Título curto + subtítulo em bold + parágrafo + micro-CTA

**Conteúdo (fornecido pelo usuário):**

Card 1 — "Sua rede, seu conteúdo, sua regra"
- CTA: Entre na Monetisexy
- Texto: "Um espaço só seu para criar, se conectar e ser recompensado por quem você é — sem filtros, sem intermediário te dizendo o que pode ou não pode. Milhares de pessoas já estão aqui, dos dois lados da tela."
- Rodapé: "Cadastro em menos de 2 minutos. Sem cartão, sem compromisso."

Card 2 — "Sua imagem vale — e agora rende"
- CTA: Comece a faturar hoje
- Texto: "Defina seu preço, publique no seu ritmo e receba 85% de tudo que vender — direto na sua conta, via Pix. Assinatura, conteúdo avulso, chamada, gorjeta: você escolhe como monetizar, a gente cuida do resto."
- Rodapé: "Aprovação em até 2 dias úteis. Primeiro saque liberado assim que confirmado."

Card 3 — "O que você procura, alguém já está criando"
- CTA: Descubra seus criadores favoritos
- Texto: "Perfis exclusivos, conteúdo que não existe em nenhum outro lugar, e uma conexão real com quem você acompanha."
- Rodapé: "Pix, cartão, do jeito que for mais fácil pra você. Navegação e cadastro gratuitos — você só paga pelo que quiser assinar."

### Alterações em `src/routes/index.tsx`

- Extrair `LoginCard` para `src/components/site/LoginCard.tsx` (reutilizável).
- `HomePage` passa a renderizar:
  - `<div className="hidden lg:block"><ScrollLanding /></div>`
  - `<div className="lg:hidden">` layout mobile atual (LoginCard + HeroCard).
- Manter `SiteLayout` (com Navbar + Footer). A Navbar fica sobreposta ao vídeo com fundo transparente na home.

### Ajuste menor na Navbar

Adicionar prop `transparent` opcional para a home desktop (fundo `bg-transparent` sobre o vídeo, texto branco). Sem alterar outras rotas.

## Diagrama

```text
[section h-[400vh]]
  └─ [sticky top-0 h-screen]
        ├─ <video> (bg cover)
        ├─ overlay escuro (opacity ← scroll)
        ├─ 3× GlassPromoCard  (opacity+y ← scroll [0.15..0.35])
        ├─ LoginCard  (opacity+x ← scroll [0.4..0.6])
        └─ HeroCard   (opacity+x ← scroll [0.65..0.85])
```

## Arquivos afetados

- Criar: `src/components/landing/ScrollLanding.tsx`
- Criar: `src/components/landing/GlassPromoCard.tsx`
- Criar: `src/components/site/LoginCard.tsx` (extração)
- Editar: `src/routes/index.tsx` (split desktop/mobile + import ScrollLanding)
- Editar (mínimo): `src/components/site/Navbar.tsx` (prop `transparent`)

## Fora do escopo

- Sem alterações em cadastro, footer, autenticação ou dados.
- Sem GSAP — usaremos Framer Motion (já instalado).
- Mobile mantém o layout atual sem scroll-jack.
