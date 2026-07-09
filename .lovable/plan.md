## Diagnóstico

O fundo da `/promotion` é branco (correto). O problema é que copiei classes escuras do onboarding (`text-white`, `border-white/10`, `bg-white/5`, `text-white/60`) — em fundo claro tudo some. Preciso trocar essas classes por tokens/valores visíveis em fundo branco, mantendo o fundo como está.

## Mudanças

### `src/components/promotion/PromotionShell.tsx`
- Container: remover `text-white`, usar `text-foreground`. Remover camadas escuras (`bg-[#0b0713]`, gradiente radial, textura de pontos) — não existem nesse arquivo hoje, apenas garantir que nada force fundo escuro.
- Header: `border-b border-border bg-background/80 backdrop-blur-md`; botão de voltar `hover:bg-muted text-foreground`; título `text-foreground`.
- Trilha da barra de progresso: `bg-muted` (em vez de `bg-white/10`); preenchimento continua `bg-gradient-primary`.
- Footer: `border-t border-border bg-background/80 backdrop-blur-md`.
- Botão secundário (Voltar) no footer: `border-border bg-background text-foreground hover:bg-muted`.

### `src/routes/_authenticated/promotion.tsx`
- `PromotionHeader`: título `text-foreground`, subtítulo `text-muted-foreground`.
- `PillInput` / `PillSelect`: `bg-background text-foreground border-border placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20`.
- Textarea da descrição: mesmos tokens acima.
- Cards de opção (duração, gate, desconto): `bg-background border-border text-foreground`, estado selecionado `border-primary bg-primary/5`.
- Tela de sucesso: ícone e textos com `text-foreground` / `text-muted-foreground`.
- Botão CTA principal permanece com `bg-gradient-primary text-white` (já legível).

Nenhuma mudança em outros arquivos, rotas ou lógica dos steps.

## Validação

Abrir `/promotion` em `/dashboard → Ofertas` e conferir:
- Fundo branco preservado.
- Título "Como você quer chamar essa oferta?" e subtítulo legíveis.
- Input em pill com borda cinza clara, texto preto ao digitar.
- Rodapé com botões visíveis.
- Percorrer os 7 steps sem nenhum elemento sumindo.
