## Objetivo

Trocar o card "Seu feed está vazio" em `/feed` por um carrossel circular animado com 3 imagens placeholder + textos explicando o app. Sem CTA embaixo.

## Passos

**1. Criar `src/components/feed/CircularSteps.tsx`**
- Adaptação TypeScript-limpa do componente enviado pelo usuário (CircularTestimonials), renomeado para `CircularSteps`.
- Remover dependência de `react-icons/fa` (não está no projeto) — usar `ArrowLeft` / `ArrowRight` do `lucide-react` (já usado no feed).
- Manter framer-motion (já usado no feed).
- Props: `steps: { title, subtitle, description, src }[]`, `autoplay`, `colors`, `fontSizes`.
- Corrigir tipos (`useRef<HTMLDivElement | null>`, `useRef<ReturnType<typeof setInterval> | null>`, etc.) e o JSX truncado do trecho colado.
- Layout: imagens circulares empilhadas (ativa + esquerda + direita com rotateY), texto ao lado (título / subtítulo / descrição animada palavra-a-palavra), setas prev/next.
- Estilo alinhado ao tema escuro do feed: bordas `white/10`, fundo translúcido, texto branco/`white/70`, botões com gradiente fúcsia→roxo no hover (via prop `colors`).

**2. Steps genéricos (definidos por mim)**
1. **Descubra creators** — "Explore perfis em alta e encontre quem combina com você."
2. **Assine e desbloqueie** — "Assinaturas, PPV, tips e chat privado num só lugar."
3. **Interaja de verdade** — "Comente, mande tips e participe de desafios exclusivos."

Imagens: 3 placeholders (`https://images.unsplash.com/...` genéricos temáticos ou `/placeholder.svg` do projeto — usar `/placeholder.svg` para ficarem 100% neutros até o usuário trocar).

**3. Editar `src/routes/_authenticated/feed.tsx`**
- Substituir o bloco `<motion.section>` do estado vazio (linhas ~194–220) por `<CircularSteps steps={...} />` dentro de um wrapper `motion.section` mantendo o mesmo card externo (borda, blur, padding).
- Remover import de `Sparkles` se não for mais usado, e o `<Link to="/em-alta">` (CTA removido conforme pedido).

## Fora de escopo
- Fluxos de pagamento, feed real, Veriff, outras rotas.
- Substituição das imagens placeholder (usuário troca depois).
